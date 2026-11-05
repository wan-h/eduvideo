# -*- coding: utf-8 -*-
'''
@File    :   openai.py
@Author  :   一力辉
'''


import json
from fastapi import APIRouter, Request
from src.schema import TASK_TYPE
from src.server.depends import HeaderInfo, DBSession
from src.server.api.task.schema import TaskSubmitResp, TaskInfoResp
from src.server.api.task.task_v0 import submit_task, get_task_status
from src.tasks.question_explanation_video_gen.video_synthesis.schema import ScriptVideoSynthesisParams, ScriptVideoSynthesisReq
from .utils import get_default_tts_voice_type

router = APIRouter(prefix="/eduvideo/v0/video")


from uuid import uuid4
from src.server.dal.task import get_task_dal
from src.server.dal.eduvideo import WorkspaceDAL, VideoSynthesisRecordDAL
from src.tasks.question_explanation_video_gen.script_gen.schema import ScriptGenReq
from src.server.api.eduvideo.synthesis_v0 import SubmitVideoSynthesisReq

# ==================== 创建视频生成任务 ====================
@router.post("/generations", response_model=TaskSubmitResp, summary="Submit Video Generation Task (OpenAI Style)")
async def api_submit_openai_video(
    request: Request,
    header: HeaderInfo,
    session: DBSession,
    workspace_dal: WorkspaceDAL,
    video_synthesis_record_dal: VideoSynthesisRecordDAL,
    req: ScriptVideoSynthesisParams
):
    req.voice = req.voice if req.voice else get_default_tts_voice_type(req.language)
    script_task_dal = get_task_dal(TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT, session)
    synthesis_task_dal = get_task_dal(TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS, session)
    
    script_workflow_id = f"{TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT}_{uuid4()}"
    synthesis_workflow_id = f"{TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS}_{uuid4()}"

    async with session.begin():
        # 1. 预分配 Script 任务
        script_payload = ScriptGenReq(
            text=req.text,
            urls=req.urls,
            voice=req.voice,
            stage=req.stage,
            language=req.language
        ).model_dump_json()
        script_task = await script_task_dal.create(
            user_id=header.user_id,
            workflow_id=script_workflow_id,
            request=script_payload
        )
        
        # 2. 绑定 Workspace
        await workspace_dal.create_script_relation(
            user_id=header.user_id,
            script_task_id=script_task.id,
            folder_id="" # 默认放到根目录
        )

        # 3. 预分配 Synthesis 任务
        synthesis_payload = SubmitVideoSynthesisReq(
            script_id=script_task.id,
            export_settings=req.video_export_desc
        ).model_dump_json()
        synthesis_task = await synthesis_task_dal.create(
            user_id=header.user_id,
            workflow_id=synthesis_workflow_id,
            request=synthesis_payload
        )

        # 4. 绑定 Synthesis 记录
        await video_synthesis_record_dal.create(
            user_id=header.user_id,
            script_task_id=script_task.id,
            synthesis_task_id=synthesis_task.id,
            script_md5=None # 此时脚本未生成，为None
        )

    # 5. 修改原请求的 payload，追加分配好的 ID
    payload_req = ScriptVideoSynthesisReq(
        **req.model_dump(),
        script_task_id=script_task.id,
        synthesis_task_id=synthesis_task.id
    )
    payload = payload_req.model_dump_json()

    # 6. 提交父任务并拉起 Temporal Workflow
    submit_resp = await submit_task(
        request=request,
        header=header,
        session=session,
        task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT_SYNTHESIS,
        payload=payload
    )

    return submit_resp


@router.get("/generations/{id}", response_model=TaskInfoResp, summary="Query Video Generation Task Status (OpenAI Style)")
async def api_get_openai_video(
    header: HeaderInfo,
    session: DBSession,
    id: str
):
    return await get_task_status(
        header=header,
        session=session,
        task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT_SYNTHESIS,
        task_id=id
    )
