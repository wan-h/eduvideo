# -*- coding: utf-8 -*-
"""
@File    : tasks_v0.py
@Author  : 一力辉
"""

import os
from dataclasses import dataclass
from typing import Any, Callable
from uuid import uuid4
from fastapi import APIRouter, Request, Body, UploadFile, File, Form
from pydantic import BaseModel
from temporalio.client import Client
from src.schema import TASK_STATUS, TASK_TYPE, RequestInfo
from src.server.dal.storage import StorageDAL
from src.server.dal.task import get_task_dal
from src.server.models.task import BaseTask
from src.server.depends import HeaderInfo, DBSession
from src.server.exceptions import InvalidException, NotFoundException
from src.tasks.schema import BaseWorkflowParams
from src.tasks.doc_parse.schema import DocParseReq, DocParseWorkflowParams
from src.tasks.doc_parse.workflows import DocParseWorkflow
from src.tasks.question_extract.schema import QuestionExtractReq, QuestionExtractWorkflowParams
from src.tasks.question_extract.workflows import QuestionExtractWorkflow
from src.tasks.readable_tts.schema import ReadableTTSReq, ReadableTTSWorkflowParams
from src.tasks.readable_tts.workflows import ReadableTTSWorkflow
from src.tasks.question_explanation_video_gen.script_gen.schema import ScriptGenWorkflowParams, ScriptGenReq
from src.tasks.question_explanation_video_gen.script_gen.workflows import ScriptGenWorkflow
from src.tasks.question_explanation_video_gen.video_synthesis.schema import VideoSynthesisWorkflowParams, VideoSynthesisReq, \
    ScriptVideoSynthesisWorkflowParams, ScriptVideoSynthesisReq
from src.tasks.question_explanation_video_gen.video_synthesis.workflows import VideoSynthesisWorkflow, VideoScriptSynthesisWorkflow
from src.tasks.question_solve.schema import QuestionSolveReq, QuestionSolveWorkflowParams
from src.tasks.question_solve.workflows import QuestionSolveWorkflow
from src.tasks.question_parse.schema import QuestionParseReq, QuestionParseWorkflowParams
from src.tasks.question_parse.workflows import QuestionParseWorkflow
from src.utils import config, get_bytes_md5
from .schema import TaskSubmitResp, TaskInfoResp, BaseResponse

router = APIRouter(prefix="/task/v0")


# ========================= 任务处理器注册 ===========================
@dataclass
class TaskHandlerConfig:
    """任务处理器配置，用于适配不同任务类型"""
    request_model: type[BaseModel]                                  # 请求参数模型
    workflow_class: Any                                             # Temporal Workflow 类
    build_workflow_params: Callable[[RequestInfo, str, Any], Any]   # (request_info, task_id, params) -> workflow_params
    get_task_queue: Callable[[bool], str]                           # 获取任务队列名称，接收 use_fast_queue 参数
    default_request_factory: Callable[[], BaseModel] | None = None  # payload 为空时的默认请求工厂
    pre_submit: Callable[..., Any] | None = None                   # async (params, files, user_id) -> params


async def _doc_parse_pre_submit(
    params: DocParseReq, 
    files: list[UploadFile], 
    user_id: str
) -> DocParseReq:
    if len(files) > 2:
        raise InvalidException.InvalidInput(f"files should be less than 2, but got {len(files)}")
    if len(files) > 0 and params.url:
        raise InvalidException.InvalidInput("Cannot provide both file and url")
    if len(files) > 0:
        file_obj = files[0]
        image_bytes = file_obj.file.read()
        md5 = get_bytes_md5(image_bytes)
        extension = os.path.splitext(file_obj.filename)[1]
        url = await StorageDAL.upload_file(
            user_id=user_id,
            file_name=f"{md5}{extension}",
            file=image_bytes,
        )
        params.url = url
    return params

async def _question_extract_pre_submit(
    params: QuestionExtractReq, 
    files: list[UploadFile], 
    user_id: str
) -> QuestionExtractReq:
    if len(files) > 5:
        raise InvalidException.InvalidInput(f"files should be less than 5, but got {len(files)}")
    if len(files) > 0 and len(params.urls) > 0:
        raise InvalidException.InvalidInput("Cannot provide both file and urls")
    if len(files) > 0:
        urls = []
        for file_obj in files:
            image_bytes = file_obj.file.read()
            md5 = get_bytes_md5(image_bytes)
            extension = os.path.splitext(file_obj.filename)[1] if file_obj.filename else ""
            url = await StorageDAL.upload_file(
                user_id=user_id,
                file_name=f"{md5}{extension}",
                file=image_bytes,
            )
            urls.append(url)
        params.urls = urls
    return params

async def _question_explanation_video_gen_script_pre_submit(
    params: ScriptGenReq, 
    files: list[UploadFile], 
    user_id: str
) -> ScriptGenReq:
    if len(files) > 3:
        raise InvalidException.InvalidInput(f"files should be less than 3, but got {len(files)}")
    if len(files) > 0 and len(params.urls) > 0:
        raise InvalidException.InvalidInput("Cannot provide both file and urls")
    for file_obj in files:
        image_bytes = file_obj.file.read()
        md5 = get_bytes_md5(image_bytes)
        extension = os.path.splitext(file_obj.filename)[1]
        url = await StorageDAL.upload_file(
            user_id=user_id,
            file_name=f"{md5}{extension}",
            file=image_bytes,
        )
        params.urls.append(url)

    return params

async def _question_explanation_video_gen_script_video_synthesis_pre_submit(
    params: ScriptVideoSynthesisReq, 
    files: list[UploadFile], 
    user_id: str
) -> ScriptVideoSynthesisReq:
    return await _question_explanation_video_gen_script_pre_submit(params, files, user_id)  # type: ignore

async def _question_solve_pre_submit(
    params: QuestionSolveReq, 
    files: list[UploadFile], 
    user_id: str
) -> QuestionSolveReq:
    if len(files) > 3:
        raise InvalidException.InvalidInput(f"files should be less than 3, but got {len(files)}")
    if len(files) > 0 and len(params.question_images) > 0:
        raise InvalidException.InvalidInput("Cannot provide both file and question_images")
    for file_obj in files:
        image_bytes = file_obj.file.read()
        md5 = get_bytes_md5(image_bytes)
        extension = os.path.splitext(file_obj.filename)[1]
        url = await StorageDAL.upload_file(
            user_id=user_id,
            file_name=f"{md5}{extension}",
            file=image_bytes,
        )
        params.question_images.append(url)

    return params

async def _question_parse_pre_submit(
    params: QuestionParseReq, 
    files: list[UploadFile], 
    user_id: str
) -> QuestionParseReq:
    if len(files) > 3:
        raise InvalidException.InvalidInput(f"files should be less than 3, but got {len(files)}")
    if len(files) > 0 and len(params.urls) > 0:
        raise InvalidException.InvalidInput("Cannot provide both file and urls")
    for file_obj in files:
        image_bytes = file_obj.file.read()
        md5 = get_bytes_md5(image_bytes)
        extension = os.path.splitext(file_obj.filename)[1]
        url = await StorageDAL.upload_file(
            user_id=user_id,
            file_name=f"{md5}{extension}",
            file=image_bytes,
        )
        params.urls.append(url)

    return params

def _build_doc_parse_workflow_params(request_info: RequestInfo, task_id: str, params: DocParseReq) -> DocParseWorkflowParams:
    return DocParseWorkflowParams(resquest_info=request_info, task_id=task_id, url=params.url)

def _build_question_extract_workflow_params(request_info: RequestInfo, task_id: str, params: QuestionExtractReq) -> QuestionExtractWorkflowParams:
    return QuestionExtractWorkflowParams(resquest_info=request_info, task_id=task_id, urls=params.urls)

def _build_readable_tts_workflow_params(request_info: RequestInfo, task_id: str, params: ReadableTTSReq) -> ReadableTTSWorkflowParams:
    return ReadableTTSWorkflowParams(
        resquest_info=request_info, task_id=task_id, text=params.text,
        voice=params.voice, subject=params.subject, language=params.language,
        skip_translate=params.skip_translate
    )

def _build_script_gen_workflow_params(request_info: RequestInfo, task_id: str, params: ScriptGenReq) -> ScriptGenWorkflowParams:
    return ScriptGenWorkflowParams(
        resquest_info=request_info, task_id=task_id, text=params.text, voice=params.voice,
        urls=params.urls, stage=params.stage, language=params.language
    )

def _build_video_synthesis_workflow_params(request_info: RequestInfo, task_id: str, params: VideoSynthesisReq) -> VideoSynthesisWorkflowParams:
    return VideoSynthesisWorkflowParams(
        resquest_info=request_info, task_id=task_id, video_script_desc=params.video_script_desc, video_export_desc=params.video_export_desc
    )

def _build_script_video_synthesis_workflow_params(request_info: RequestInfo, task_id: str, params: ScriptVideoSynthesisReq) -> ScriptVideoSynthesisWorkflowParams:
    return ScriptVideoSynthesisWorkflowParams(
        resquest_info=request_info, task_id=task_id, text=params.text, voice=params.voice,
        urls=params.urls, stage=params.stage, language=params.language,
        video_export_desc=params.video_export_desc,
        script_task_id=params.script_task_id,
        synthesis_task_id=params.synthesis_task_id
    )

def _build_question_solve_workflow_params(request_info: RequestInfo, task_id: str, params: QuestionSolveReq) -> QuestionSolveWorkflowParams:
    return QuestionSolveWorkflowParams(
        resquest_info=request_info, task_id=task_id, question_text=params.question_text,
        question_images=params.question_images, subject=params.subject,
        stage=params.stage, language=params.language,
    )

def _build_question_parse_workflow_params(request_info: RequestInfo, task_id: str, params: QuestionParseReq) -> QuestionParseWorkflowParams:
    return QuestionParseWorkflowParams(
        resquest_info=request_info, task_id=task_id, text=params.text,
        urls=params.urls, stage=params.stage, language=params.language,
    )


TASK_HANDLER_REGISTRY: dict[TASK_TYPE, TaskHandlerConfig] = {
    TASK_TYPE.DOC_PARSE: TaskHandlerConfig(
        request_model=DocParseReq,
        workflow_class=DocParseWorkflow,
        build_workflow_params=_build_doc_parse_workflow_params,
        get_task_queue=lambda fast: config.tasks.doc_parse.fast_task_queue if fast else config.tasks.doc_parse.task_queue,
        default_request_factory=lambda: DocParseReq(url=""),
        pre_submit=_doc_parse_pre_submit,
    ),
    TASK_TYPE.QUESTION_EXTRACT: TaskHandlerConfig(
        request_model=QuestionExtractReq,
        workflow_class=QuestionExtractWorkflow,
        build_workflow_params=_build_question_extract_workflow_params,
        get_task_queue=lambda fast: config.tasks.question_extract.fast_task_queue if fast else config.tasks.question_extract.task_queue,
        default_request_factory=lambda: QuestionExtractReq(url=""),
        pre_submit=_question_extract_pre_submit,
    ),
    TASK_TYPE.READABLE_TTS: TaskHandlerConfig(
        request_model=ReadableTTSReq,
        workflow_class=ReadableTTSWorkflow,
        build_workflow_params=_build_readable_tts_workflow_params,
        get_task_queue=lambda fast: config.tasks.readable_tts.fast_task_queue if fast else config.tasks.readable_tts.task_queue,
    ),
    TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT: TaskHandlerConfig(
        request_model=ScriptGenReq,
        workflow_class=ScriptGenWorkflow,
        build_workflow_params=_build_script_gen_workflow_params,
        get_task_queue=lambda fast: config.tasks.question_explanation_video_gen_script.fast_task_queue if fast else config.tasks.question_explanation_video_gen_script.task_queue,
        pre_submit=_question_explanation_video_gen_script_pre_submit,
    ),
    TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS: TaskHandlerConfig(
        request_model=VideoSynthesisReq,
        workflow_class=VideoSynthesisWorkflow,
        build_workflow_params=_build_video_synthesis_workflow_params,
        get_task_queue=lambda fast: config.tasks.question_explanation_video_gen_synthesis.fast_task_queue if fast else config.tasks.question_explanation_video_gen_synthesis.task_queue,
    ),
    TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT_SYNTHESIS: TaskHandlerConfig(
        request_model=ScriptVideoSynthesisReq,
        workflow_class=VideoScriptSynthesisWorkflow,
        build_workflow_params=_build_script_video_synthesis_workflow_params,
        get_task_queue=lambda fast: config.tasks.question_explanation_video_gen_synthesis.fast_task_queue if fast else config.tasks.question_explanation_video_gen_synthesis.task_queue,
        pre_submit=_question_explanation_video_gen_script_video_synthesis_pre_submit,
    ),
    TASK_TYPE.QUESTION_SOLVE: TaskHandlerConfig(
        request_model=QuestionSolveReq,
        workflow_class=QuestionSolveWorkflow,
        build_workflow_params=_build_question_solve_workflow_params,
        get_task_queue=lambda fast: config.tasks.question_solve.fast_task_queue if fast else config.tasks.question_solve.task_queue,
        pre_submit=_question_solve_pre_submit,
    ),
    TASK_TYPE.QUESTION_PARSE: TaskHandlerConfig(
        request_model=QuestionParseReq,
        workflow_class=QuestionParseWorkflow,
        build_workflow_params=_build_question_parse_workflow_params,
        get_task_queue=lambda fast: config.tasks.question_parse.fast_task_queue if fast else config.tasks.question_parse.task_queue,
        pre_submit=_question_parse_pre_submit,
    )
}



# ========================= 提交任务 ===========================

async def submit_task(
    request: Request,
    header: HeaderInfo,
    session: DBSession,
    task_type: TASK_TYPE,
    payload: str = "",
    workflow_param: BaseWorkflowParams = BaseWorkflowParams(),
    files: list[UploadFile] = [],
    use_fast_queue: bool = False,
) -> TaskSubmitResp:
    """Plain async helper — safe to call directly outside FastAPI DI."""
    # 1. 获取任务 DAL
    try:
        task_dal = get_task_dal(task_type, session)
    except ValueError as e:
        raise InvalidException.InvalidInput(str(e))

    # 2. 获取任务处理器配置
    handler = TASK_HANDLER_REGISTRY.get(task_type)
    if not handler:
        raise InvalidException.InvalidInput(f"Unsupported task type: {task_type}")

    # 3. 解析请求参数
    try:
        if payload:
            params = handler.request_model.model_validate_json(payload)
        elif handler.default_request_factory:
            params = handler.default_request_factory()
        else:
            raise InvalidException.InvalidInput(f"Payload is required for {task_type} task")
    except InvalidException.InvalidInput:
        raise
    except Exception as e:
        raise InvalidException.InvalidInput(f"Invalid payload for {task_type} task: {e}")

    # 4. 预处理（如文件上传）
    if handler.pre_submit:
        params = await handler.pre_submit(params, files, header.user_id)

    # 5. 创建任务记录
    workflow_id = f"{task_type}_{uuid4()}"
    async with session.begin():
        task: BaseTask = await task_dal.create(
            user_id=header.user_id,
            workflow_id=workflow_id,
            request=params.model_dump_json(),
        )

    # 6. 提交 Temporal Workflow
    client: Client = request.app.state.temporal_client
    workflow_params: BaseWorkflowParams = handler.build_workflow_params(header, task.id, params)
    workflow_params_updated = workflow_params.model_copy(update=workflow_param.model_dump())
    
    task_queue = handler.get_task_queue(use_fast_queue)
    if use_fast_queue and not task_queue:
        raise InvalidException.InvalidInput(f"Fast queue is not supported for task type: {task_type}")

    await client.start_workflow(
        handler.workflow_class,
        workflow_params_updated,
        id=workflow_id,
        task_queue=task_queue,
    )

    return TaskSubmitResp(data=task.id)


@router.post("/{task_type}", response_model=TaskSubmitResp, summary="Submit Task")
async def api_submit_task(
    request: Request,
    header: HeaderInfo, 
    session: DBSession,
    task_type: TASK_TYPE,
    payload: str = Form("", description="任务请求参数，json字符串"),
    files: list[UploadFile] = [],
):
    return await submit_task(
        request=request,
        header=header,
        session=session,
        task_type=task_type,
        payload=payload,
        files=files,
    )


# ========================= 获取任务信息 ===========================

async def get_task_status(
    header: HeaderInfo,
    session: DBSession,
    task_type: TASK_TYPE,
    task_id: str,
) -> TaskInfoResp:
    """Plain async helper — safe to call directly outside FastAPI DI."""
    try:
        task_dal = get_task_dal(task_type, session)
    except ValueError as e:
        raise InvalidException.InvalidInput(str(e))

    async with session.begin():
        task: BaseTask = await task_dal.query_by_id(
            user_id=header.user_id,
            id=task_id
        )
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


@router.get("/{task_type}/{task_id}", response_model=TaskInfoResp, summary="Get Task Status")
async def api_get_task_status(
    header: HeaderInfo, 
    session: DBSession,
    task_type: TASK_TYPE,
    task_id: str
):
    return await get_task_status(
        header=header,
        session=session,
        task_type=task_type,
        task_id=task_id,
    )

# ========================= 取消任务 ===========================
@router.put("/{task_type}/{task_id}/cancel", response_model=BaseResponse, summary="Cancel Task")
async def api_cancel_task(
    request: Request,
    header: HeaderInfo, 
    session: DBSession,
    task_type: TASK_TYPE,
    task_id: str
):
    try:
        task_dal = get_task_dal(task_type, session)
    except ValueError as e:
        raise InvalidException.InvalidInput(str(e))

    async with session.begin():
        task: BaseTask = await task_dal.query_by_id(
            user_id=header.user_id,
            id=task_id
        )
        if task is None:
            raise NotFoundException.NotFound(f"Task not found: {task_id}")

        if int(task.status) != TASK_STATUS.PENDING:
            if int(task.status) >= TASK_STATUS.SUCCESS:
                return BaseResponse(data="success")
            raise InvalidException.InvalidOperation("The task is already in progress and can't be canceled.")

        # 取消任务
        workflow_id = task.workflow_id
        client: Client = request.app.state.temporal_client
        handle = client.get_workflow_handle(workflow_id)
        try:
            await handle.cancel()
            # Update DB status to REVOKED
            task = await task_dal.update_by_id(
                user_id=header.user_id,
                id=task_id,
                status=TASK_STATUS.REVOKED,
                message="Task has been cancelled"
            )
        except Exception as e:
            try:
                await handle.terminate()
            except Exception:
                ...
            task = await task_dal.update_by_id(
                user_id=header.user_id,
                id=task_id,
                status=TASK_STATUS.REVOKED,
                message=f"Task terminate, cancel fail: {str(e)}"
            )

        return BaseResponse(data="success")


# ========================= 更新任务状态 ===========================
async def update_task_status(
    header: HeaderInfo,
    session: DBSession,
    task_type: TASK_TYPE,
    task_id: str,
    status: TASK_STATUS | None = None,
    progress: int | None = None,
    message: str | None = None,
    result: str | None = None,
) -> BaseResponse:
    """Plain async helper — safe to call directly outside FastAPI DI."""
    try:
        task_dal = get_task_dal(task_type, session)
    except ValueError as e:
        raise InvalidException.InvalidInput(str(e))

    async with session.begin():
        await task_dal.update_by_id(
            id=task_id,
            user_id=header.user_id,
            status=status,
            progress=progress,
            message=message,
            result=result
        )
    return BaseResponse(data="success")


@router.put("/{task_type}/{task_id}", response_model=BaseResponse, summary="Update Task")
async def api_update_task_status(
    header: HeaderInfo, 
    session: DBSession,
    task_type: TASK_TYPE,
    task_id: str,
    status: TASK_STATUS | None = Body(default=None, description="Task status"),
    progress: int | None = Body(default=None, description="Task progress"),
    message: str | None = Body(default=None, description="Task message"),
    result: str | None = Body(default=None, description="Task result")
):
    return await update_task_status(
        header=header,
        session=session,
        task_type=task_type,
        task_id=task_id,
        status=status,
        progress=progress,
        message=message,
        result=result,
    )

# ========================= 删除任务 ===========================
@router.delete("/{task_type}/{task_id}", response_model=BaseResponse, summary="Delete Task")
async def api_delete_task(
    request: Request,
    header: HeaderInfo, 
    session: DBSession,
    task_type: TASK_TYPE,
    task_id: str
):
    try:
        task_dal = get_task_dal(task_type, session)
    except ValueError as e:
        raise InvalidException.InvalidInput(str(e))

    # 1. 尝试取消/终止任务（复用已实现的取消接口）
    await api_cancel_task(
        request=request,
        header=header,
        session=session,
        task_type=task_type,
        task_id=task_id
    )

    # 2. 删除任务（软删除）
    async with session.begin():
        await task_dal.delete_by_id(
            id=task_id,
            user_id=header.user_id,
        )
    return BaseResponse(data="success")
