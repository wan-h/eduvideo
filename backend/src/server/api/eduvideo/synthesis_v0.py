# -*- coding: utf-8 -*-
"""
@File    :   synthesis_v0.py
@Author  :   一力辉
"""

import hashlib
from datetime import datetime

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from sqlalchemy import select

from src.schema import TASK_STATUS, TASK_TYPE
from src.server.api.task.schema import TaskInfoResp
from src.server.api.task.task_v0 import TaskSubmitResp, get_task_status, submit_task
from src.server.dal.eduvideo import VideoSynthesisRecordDAL, VideoSynthesisTemplateDAL
from src.server.dal.task import get_task_dal
from src.server.depends import DBSession, HeaderInfo
from src.server.exceptions import InvalidException, NotFoundException
from src.server.models.eduvideo import VideoSynthesisRecord
from src.server.models.task import BaseTask, QuestionExplanationVideoGenSynthesisTask
from src.server.schema.eduvideo import VideoExportDesc, VideoScriptDesc
from src.server.schema.request import BaseResponse
from src.tasks.question_explanation_video_gen.video_synthesis.schema import VideoSynthesisReq

from .schema import SynthesisTaskInfo, SynthesisTaskListResp

router = APIRouter(prefix="/eduvideo/v0/synthesis")


# ========================= 导出模板管理 Schema ===========================


class TemplateInfo(BaseModel):
    id: str = Field(..., description="模板ID")
    name: str = Field(..., description="模板名称")
    template: VideoExportDesc = Field(..., description="导出配置")
    created_at: datetime = Field(..., description="创建时间")


class TemplateListResp(BaseResponse):
    data: list[TemplateInfo] = Field([], description="模板列表")


class CreateTemplateReq(BaseModel):
    name: str = Field(..., description="模板名称", min_length=1)
    template: VideoExportDesc = Field(..., description="导出配置")


class UpdateTemplateReq(BaseModel):
    name: str | None = Field(None, description="新模板名称")
    template: VideoExportDesc | None = Field(None, description="新导出配置")


# ========================= 导出模板管理（静态路由，必须在 /{script_id} 之前注册）===========================


@router.post("/template", response_model=TemplateListResp, summary="Create Export Template")
async def api_create_export_template(
    header: HeaderInfo, session: DBSession, template_dal: VideoSynthesisTemplateDAL, req: CreateTemplateReq
):
    async with session.begin():
        if await template_dal.check_name_exists(header.user_id, req.name):
            raise InvalidException.InvalidInput(f"Template name '{req.name}' already exists.")
        record = await template_dal.create(user_id=header.user_id, name=req.name, template=req.template.model_dump())

    return TemplateListResp(
        data=[
            TemplateInfo(
                id=record.id,
                name=record.name,
                template=VideoExportDesc.model_validate(record.template),
                created_at=record.created_at,
            )
        ]
    )


@router.get("/template", response_model=TemplateListResp, summary="Get Export Template List")
async def api_get_export_template_list(header: HeaderInfo, session: DBSession, template_dal: VideoSynthesisTemplateDAL):
    async with session.begin():
        records = await template_dal.query_by_user_id(header.user_id)

    return TemplateListResp(
        data=[
            TemplateInfo(
                id=r.id, name=r.name, template=VideoExportDesc.model_validate(r.template), created_at=r.created_at
            )
            for r in records
        ]
    )


@router.put("/template/{template_id}", response_model=BaseResponse, summary="Update Export Template")
async def api_update_export_template(
    header: HeaderInfo,
    session: DBSession,
    template_dal: VideoSynthesisTemplateDAL,
    template_id: str,
    req: UpdateTemplateReq,
):
    if req.name is None and req.template is None:
        raise InvalidException.InvalidInput("At least one of 'name' or 'template' must be provided.")

    async with session.begin():
        if req.name is not None:
            if await template_dal.check_name_exists(header.user_id, req.name, exclude_id=template_id):
                raise InvalidException.InvalidInput(f"Template name '{req.name}' already exists.")
        record = await template_dal.update(
            template_id=template_id,
            user_id=header.user_id,
            name=req.name,
            template=req.template.model_dump() if req.template else None,
        )

    if record is None:
        raise NotFoundException.NotFound(f"Template not found: {template_id}")

    return BaseResponse()


@router.delete("/template/{template_id}", response_model=BaseResponse, summary="Delete Export Template")
async def api_delete_export_template(
    header: HeaderInfo, session: DBSession, template_dal: VideoSynthesisTemplateDAL, template_id: str
):
    async with session.begin():
        deleted = await template_dal.delete(template_id, header.user_id)

    if not deleted:
        raise NotFoundException.NotFound(f"Template not found: {template_id}")

    return BaseResponse()


@router.get("/template/{template_id}", response_model=TemplateListResp, summary="Get Export Template By ID")
async def api_get_export_template(
    header: HeaderInfo, session: DBSession, template_dal: VideoSynthesisTemplateDAL, template_id: str
):
    async with session.begin():
        record = await template_dal.query_by_id(
            template_id,
            # header.user_id
        )

    if not record:
        raise NotFoundException.NotFound(f"Template not found: {template_id}")

    return TemplateListResp(
        data=[
            TemplateInfo(
                id=record.id,
                name=record.name,
                template=VideoExportDesc.model_validate(record.template),
                created_at=record.created_at,
            )
        ]
    )


# ========================= 提交视频合成任务 ===========================


class SubmitVideoSynthesisReq(BaseModel):
    script_id: str = Field(..., description="脚本ID")
    export_settings: VideoExportDesc = Field(..., description="导出设置")


@router.post("", response_model=TaskSubmitResp, summary="Submit Question Explanation Video Synthesis Task")
async def api_submit_video_synthesis_task(
    request: Request,
    header: HeaderInfo,
    session: DBSession,
    video_synthesis_record_dal: VideoSynthesisRecordDAL,
    req: SubmitVideoSynthesisReq,
):
    # 查询脚本任务
    try:
        script_task_dal = get_task_dal(TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT, session)
    except ValueError as e:
        raise InvalidException.InvalidInput(str(e))

    async with session.begin():
        script_task: BaseTask = await script_task_dal.query_by_id(id=req.script_id, user_id=header.user_id)

    if script_task is None:
        raise NotFoundException.NotFound(f"Script task not found: {req.script_id}")

    # 校验脚本任务状态
    if int(script_task.status) != TASK_STATUS.SUCCESS:
        raise InvalidException.InvalidInput(
            f"Script task is not completed successfully (current status: {script_task.status})"
        )

    # 计算脚本内容与导出设置组合的 MD5（防止修改导出模板后误命中历史复用）
    script_content = script_task.result or ""
    export_settings_json = req.export_settings.model_dump_json(by_alias=True)
    combined_content = f"{script_content}_{export_settings_json}"
    script_md5 = hashlib.md5(combined_content.encode("utf-8")).hexdigest()

    # 查询是否有相同 MD5 且在运行或成功的历史任务
    try:
        synthesis_task_dal = get_task_dal(TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS, session)
    except ValueError as e:
        raise InvalidException.InvalidInput(str(e))

    async with session.begin():
        existing_record = await video_synthesis_record_dal.query_active_by_md5(
            user_id=header.user_id, script_task_id=req.script_id, script_md5=script_md5
        )
        if existing_record:
            # 查询关联的合成任务状态
            existing_task: BaseTask = await synthesis_task_dal.query_by_id(
                id=existing_record.synthesis_task_id, user_id=header.user_id
            )
            # 如果存在关联任务，且任务未失败或取消，则直接复用
            if existing_task and int(existing_task.status) not in (TASK_STATUS.FAILURE, TASK_STATUS.REVOKED):
                return TaskSubmitResp(data=existing_record.synthesis_task_id)

    # 构建并提交合成任务
    synthesis_payload = VideoSynthesisReq(
        video_script_desc=VideoScriptDesc.model_validate_json(script_task.result), video_export_desc=req.export_settings
    ).model_dump_json()

    submit_resp = await submit_task(
        request=request,
        header=header,
        session=session,
        task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS,
        payload=synthesis_payload,
    )

    # 在 VideoSynthesisRecordDAL 中记录关联关系，并保存 script_md5
    async with session.begin():
        await video_synthesis_record_dal.create(
            user_id=header.user_id,
            script_task_id=req.script_id,
            synthesis_task_id=submit_resp.data,
            script_md5=script_md5,
        )

    return submit_resp


# ========================= 获取视频合成任务列表 ===========================


@router.get(
    "/{script_id}", response_model=SynthesisTaskListResp, summary="Get Question Explanation Video Synthesis Task List"
)
async def api_get_synthesis_task_list(
    header: HeaderInfo,
    session: DBSession,
    video_synthesis_record_dal: VideoSynthesisRecordDAL,
    script_id: str,
    limit: int = 20,
    offset: int = 0,
):
    query = (
        select(
            VideoSynthesisRecord.synthesis_task_id,
            QuestionExplanationVideoGenSynthesisTask.status,
            QuestionExplanationVideoGenSynthesisTask.progress,
            QuestionExplanationVideoGenSynthesisTask.result,
            QuestionExplanationVideoGenSynthesisTask.message,
            QuestionExplanationVideoGenSynthesisTask.created_at,
        )
        .join(
            QuestionExplanationVideoGenSynthesisTask,
            VideoSynthesisRecord.synthesis_task_id == QuestionExplanationVideoGenSynthesisTask.id,
        )
        .where(
            VideoSynthesisRecord.script_task_id == script_id,
            VideoSynthesisRecord.user_id == header.user_id,
            VideoSynthesisRecord.activate,
            QuestionExplanationVideoGenSynthesisTask.activate,
        )
        .order_by(VideoSynthesisRecord.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    async with session.begin():
        result = await session.execute(query)
        rows = result.all()
        total = await video_synthesis_record_dal.count_by_script_task_id(
            script_task_id=script_id, user_id=header.user_id
        )

    infos = [
        SynthesisTaskInfo(
            id=row.synthesis_task_id,
            status=row.status,
            progress=row.progress,
            video_url=row.result or "",
            message=row.message or "",
            created_at=row.created_at,
        )
        for row in rows
    ]

    return SynthesisTaskListResp(data=SynthesisTaskListResp.SynthesisTaskListDesc(infos=infos, total=total))


# ========================= 获取单个合成任务状态 ===========================


@router.get(
    "/{script_id}/{synthesis_id}",
    response_model=TaskInfoResp,
    summary="Get Question Explanation Video Synthesis Task Information",
)
async def api_get_synthesis_task_status(header: HeaderInfo, session: DBSession, script_id: str, synthesis_id: str):
    return await get_task_status(
        header=header,
        session=session,
        task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS,
        task_id=synthesis_id,
    )
