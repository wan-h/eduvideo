# -*- coding: utf-8 -*-
'''
@File    :   script_v0.py
@Author  :   一力辉
'''


from fastapi import APIRouter, Request
from uuid import uuid4
from temporalio.client import Client
from src.schema import TASK_TYPE, TASK_STATUS, RequestInfo
from src.server.depends import HeaderInfo, DBSession
from pydantic import BaseModel, Field
from sqlalchemy import select
from src.server.models.task import BaseTask, QuestionExplanationVideoGenScriptTask
from src.server.schema.request import BaseResponse
from src.server.dal.task import get_task_dal
from src.server.dal.eduvideo import WorkspaceDAL
from src.server.exceptions import NotFoundException, InvalidException
from src.server.api.task.schema import TaskSubmitResp, TaskInfoResp
from src.server.api.task.task_v0 import submit_task, get_task_status, update_task_status, api_delete_task
from src.server.schema.eduvideo import VideoScriptDesc
from src.tasks.question_explanation_video_gen.script_gen.schema import ScriptGenReq, ScriptGenWorkflowParams
from src.tasks.question_explanation_video_gen.script_gen.workflows import ScriptGenWorkflow
from src.utils import config
from .schema import ScriptTaskListResp, ScriptTaskInfo
from .utils import get_voice_model_id, get_default_tts_voice_type

router = APIRouter(prefix="/eduvideo/v0/script")

# ========================= 提交视频脚本生成任务 ===========================
class SubmitScriptTaskReq(ScriptGenReq):
    folder_id: str = Field("", description="文件夹ID")
@router.post("", response_model=TaskSubmitResp, summary="Submit Question Explanation Video Script Gen Task")
async def api_submit_video_script_task(
    request: Request,
    header: HeaderInfo,
    session: DBSession,
    workspace_dal: WorkspaceDAL,
    req: SubmitScriptTaskReq
):  
    if len(req.urls) == 0 and not req.text:
        raise InvalidException.InvalidInput("images or text are required")
    
    # 校验父文件夹是否存在（显式事务，避免 autobegin 导致后续 session.begin() 冲突）
    if req.folder_id:
        async with session.begin():
            folder = await workspace_dal.query_folder_by_id(req.folder_id, header.user_id)
        if not folder:
            raise NotFoundException.NotFound(f"Folder not found: {req.folder_id}")

    req.voice = req.voice if req.voice else get_default_tts_voice_type(req.language)
    payload = ScriptGenReq(
        text=req.text,
        urls=req.urls,
        voice=req.voice,
        stage=req.stage,
        language=req.language
    ).model_dump_json()

    submit_resp = await submit_task(
        request=request,
        header=header,
        session=session,
        task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT,
        payload=payload
    )

    # 记录脚本与工作空间的关联关系
    async with session.begin():
        await workspace_dal.create_script_relation(
            user_id=header.user_id,
            script_task_id=submit_resp.data,
            folder_id=req.folder_id
        )

    return submit_resp


# ========================= 获取视频脚本生成任务信息 ===========================
@router.get("/{task_id}", response_model=TaskInfoResp, summary="Get Question Explanation Video Script Gen Task Infomation")
async def api_get_video_script_task_status(
    header: HeaderInfo, 
    session: DBSession,
    task_id: str
):
    async with session.begin():
        query = select(QuestionExplanationVideoGenScriptTask).where(
            QuestionExplanationVideoGenScriptTask.id == task_id,
            #TODO: 先放开权限
            # QuestionExplanationVideoGenScriptTask.user_id == header.user_id,
            QuestionExplanationVideoGenScriptTask.activate == True
        )
        result = await session.execute(query)
        task = result.scalar()
    if task is None:
        raise NotFoundException.NotFound(f"Task not found: {task_id}")

    return TaskInfoResp(
        data=TaskInfoResp.TaskInfo(
            id=task.id,
            request=task.request,
            status=TASK_STATUS(task.status),
            progress=task.progress,
            result=task.result,
            message=task.message,
            created_at=task.created_at,
        )
    )

@router.post("/{task_id}", response_model=TaskSubmitResp, summary="Retry Question Explanation Video Script Gen Task")
async def api_retry_video_script_task(
    request: Request,
    header: HeaderInfo, 
    session: DBSession,
    task_id: str
):
    # 1. 获取任务 DAL
    try:
        task_dal = get_task_dal(TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT, session)
    except ValueError as e:
        raise InvalidException.InvalidInput(str(e))

    # 2. 查询任务信息（含原始请求和当前脚本结果）
    async with session.begin():
        task: BaseTask = await task_dal.query_by_id(
            user_id=header.user_id,
            id=task_id
        )
    if task is None:
        raise NotFoundException.NotFound(f"Task not found: {task_id}")

    # 3. 解析原始请求参数
    script_req = ScriptGenReq.model_validate_json(task.request)
    # script_req.voice = get_voice_model_id(script_req.voice, script_req.language)

    # 4. 将任务状态重置为 PENDING
    async with session.begin():
        await task_dal.update_by_id(
            id=task_id,
            user_id=header.user_id,
            status=TASK_STATUS.PENDING,
            progress=0,
            message="Task retry pending"
        )

    # 5. 构建 Workflow 参数：如果有缓存脚本则直接跳过已经执行的步骤
    workflow_params = ScriptGenWorkflowParams(
        resquest_info=header,
        task_id=task_id,
        text=script_req.text,
        urls=script_req.urls,
        voice=script_req.voice,
        stage=script_req.stage,
        language=script_req.language,
        script=task.result or "",   # 有结果则作为缓存脚本传入，跳过脚本生成步骤
    )

    # 6. 启动新的 Temporal Workflow
    new_workflow_id = f"{TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT}_{uuid4()}"
    client: Client = request.app.state.temporal_client
    await client.start_workflow(
        ScriptGenWorkflow,
        workflow_params,
        id=new_workflow_id,
        task_queue=config.tasks.question_explanation_video_gen_script.task_queue,
    )

    return TaskSubmitResp(data=task_id)


# ========================= 更新视频脚本生成任务结果 ===========================
class UpdateTaskResultReq(BaseModel):
    script: str = Field(..., description="任务结果")

@router.put("/{task_id}/result", response_model=BaseResponse, summary="Update Question Explanation Video Script")
async def api_update_video_script_task_result(
    header: HeaderInfo, 
    session: DBSession,
    task_id: str,
    req: UpdateTaskResultReq
):
    return await update_task_status(
        header=header,
        session=session,
        task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT,
        task_id=task_id,
        result=req.script
    )


# ========================= 删除视频脚本生成任务 ===========================
@router.delete("/{task_id}", response_model=BaseResponse, summary="Delete Question Explanation Video Script Gen Task")
async def api_delete_video_script_task(
    request: Request,
    header: HeaderInfo, 
    session: DBSession,
    task_id: str
):
    return await api_delete_task(
        request=request,
        header=header,
        session=session,
        task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT,
        task_id=task_id
    )


# ========================= 获取视频脚本生成任务列表 ===========================
@router.get("", response_model=ScriptTaskListResp, summary="Get Question Explanation Video Script Gen Task List")
async def api_get_script_task_list(
    header: HeaderInfo, 
    session: DBSession,
    limit: int = 20,
    offset: int = 0
):
    try:
        task_dal = get_task_dal(TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT, session)
    except ValueError as e:
        raise InvalidException.InvalidInput(str(e))

    async with session.begin():
        tasks: list[BaseTask] = await task_dal.query_by_user_id(
            user_id=header.user_id,
            limit=limit,
            offset=offset
        )

    infos = []
    for task in tasks:
        title = ""
        if task.result:
            try:
                desc = VideoScriptDesc.model_validate_json(task.result)
                if desc.question_metadata:
                    title = desc.question_metadata.title
            except Exception:
                pass

        infos.append(
            ScriptTaskInfo(
                id=task.id,
                status=task.status,
                progress=task.progress,
                result=task.result or "",
                message=task.message or "",
                created_at=task.created_at,
                text=ScriptGenReq.model_validate_json(task.request).text,
                title=title
            )
        )

    return ScriptTaskListResp(data=ScriptTaskListResp.ScriptTaskListDesc(
        total=await task_dal.count_by_user_id(user_id=header.user_id),
        infos=infos
    ))