# -*- coding: utf-8 -*-
"""
@File    : question_extract_v0.py
@Author  : 一力辉
"""

from fastapi import APIRouter, Request, Body
from pydantic import BaseModel, Field
from uuid import uuid4
import json
from sqlalchemy import select, update, or_
from src.schema import TASK_STATUS, TASK_TYPE, RequestInfo
from src.server.depends import HeaderInfo, DBSession
from src.server.exceptions import NotFoundException, InvalidException
from src.server.schema.request import BaseResponse
from src.server.models.task import QuestionExtractTask, QuestionExplanationVideoGenScriptTask
from src.server.models.eduvideo import ScriptQuestionsExtractConfirm, WorkspaceScriptRelation
from src.server.dal.task import get_task_dal
from datetime import datetime
from src.tasks.question_extract.schema import QuestionInfo
from src.tasks.question_explanation_video_gen.script_gen.schema import ScriptGenReq, ScriptGenWorkflowParams
from src.tasks.question_explanation_video_gen.script_gen.workflows import ScriptGenWorkflow
from src.utils import config
from src.server.dal.eduvideo import WorkspaceDAL
from temporalio.client import Client

router = APIRouter(prefix="/eduvideo/v0/question_extract")

class CreateQuestionExtractTaskReq(BaseModel):
    user_id: str
    script_task_id: str
    urls: list[str]
    extract_result: dict

@router.post("", response_model=BaseResponse)
async def api_create_question_extract_task(
    session: DBSession,
    req: CreateQuestionExtractTaskReq
):
    async with session.begin():
        extract_task_id = str(uuid4())
        extract_task = QuestionExtractTask(
            id=extract_task_id,
            user_id=req.user_id,
            workflow_id=str(uuid4()),
            request=json.dumps({"urls": req.urls}),
            progress=100,
            result=json.dumps(req.extract_result),
            status=TASK_STATUS.SUCCESS,
            activate=True
        )
        session.add(extract_task)

        confirm_record = ScriptQuestionsExtractConfirm(
            id=str(uuid4()),
            user_id=req.user_id,
            script_task_id=req.script_task_id,
            extract_question_task_id=extract_task_id,
            status=TASK_STATUS.WAIT_CONFIRM,
            activate=True
        )
        session.add(confirm_record)

        stmt = (
            update(QuestionExplanationVideoGenScriptTask)
            .where(
                QuestionExplanationVideoGenScriptTask.id == req.script_task_id,
                QuestionExplanationVideoGenScriptTask.user_id == req.user_id
            )
            .values(activate=False)
        )
        await session.execute(stmt)

    return BaseResponse()


class QuestionExtractConfirmInfo(BaseModel):
    id: str
    script_task_id: str
    extract_question_task_id: str
    status: int
    questions: list[QuestionInfo]
    created_at: datetime
    folder_id: str

class QueryConfirmListResp(BaseResponse):
    data: list[QuestionExtractConfirmInfo]

@router.get("", response_model=QueryConfirmListResp)
async def api_list_pending_confirms(
    header: HeaderInfo,
    session: DBSession
):
    async with session.begin():
        query = (
            select(ScriptQuestionsExtractConfirm, QuestionExtractTask.result, WorkspaceScriptRelation.folder_id)
            .join(
                QuestionExtractTask,
                QuestionExtractTask.id == ScriptQuestionsExtractConfirm.extract_question_task_id
            )
            .outerjoin(
                WorkspaceScriptRelation,
                WorkspaceScriptRelation.script_task_id == ScriptQuestionsExtractConfirm.script_task_id
            )
            .where(
                ScriptQuestionsExtractConfirm.user_id == header.user_id,
                ScriptQuestionsExtractConfirm.status == TASK_STATUS.WAIT_CONFIRM,
                ScriptQuestionsExtractConfirm.activate == True,
                QuestionExtractTask.activate == True,
                or_(WorkspaceScriptRelation.activate == True, WorkspaceScriptRelation.id == None)
            )
            .order_by(ScriptQuestionsExtractConfirm.created_at.desc())
        )
        res = await session.execute(query)
        rows = res.all()
        
        data = []
        for confirm, result_str, folder_id in rows:
            questions = []
            if result_str:
                try:
                    result_json = json.loads(result_str)
                    questions = result_json.get("questions", [])
                except Exception:
                    pass
            data.append(QuestionExtractConfirmInfo(
                id=confirm.id,
                script_task_id=confirm.script_task_id,
                extract_question_task_id=confirm.extract_question_task_id,
                status=confirm.status,
                questions=questions,
                created_at=confirm.created_at,
                folder_id=folder_id if folder_id else ""
            ))
        
        return QueryConfirmListResp(data=data)


class ConfirmQuestionExtractReq(BaseModel):
    confirm_id: str = Field(..., description="ScriptQuestionsExtractConfirm ID")
    questions: list[QuestionInfo] = Field(..., description="用户确认的题目列表")
    folder_id: str = Field("", description="文件夹ID")

@router.put("", response_model=BaseResponse)
async def api_confirm_question_extract(
    request: Request,
    header: HeaderInfo,
    session: DBSession,
    workspace_dal: WorkspaceDAL,
    req: ConfirmQuestionExtractReq
):
    async with session.begin():
        if req.folder_id:
            folder = await workspace_dal.query_folder_by_id(req.folder_id, header.user_id)
            if not folder:
                raise NotFoundException.NotFound(f"Folder not found: {req.folder_id}")
        confirm = await session.get(ScriptQuestionsExtractConfirm, req.confirm_id)
        if not confirm or confirm.user_id != header.user_id or not confirm.activate:
            raise NotFoundException.NotFound("Confirm record not found")

        if confirm.status == TASK_STATUS.CONFIRMED:
            raise InvalidException.InvalidOperation("Already confirmed")

        confirm.status = TASK_STATUS.CONFIRMED
        session.add(confirm)

        stmt = select(QuestionExplanationVideoGenScriptTask).where(
            QuestionExplanationVideoGenScriptTask.id == confirm.script_task_id
        )
        res = await session.execute(stmt)
        orig_task = res.scalar()
        if not orig_task:
            raise NotFoundException.NotFound("Original script task not found")

        orig_req = ScriptGenReq.model_validate_json(orig_task.request)
        task_dal = get_task_dal(TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT, session)

        client: Client = request.app.state.temporal_client

        for q in req.questions:
            new_req = ScriptGenReq(
                text=q.content,
                urls=[q.image],
                voice=orig_req.voice,
                stage=orig_req.stage,
                language=orig_req.language,
                question_extract=False
            )
            workflow_id = f"{TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT}_{uuid4()}"
            new_task = await task_dal.create(
                user_id=header.user_id,
                workflow_id=workflow_id,
                request=new_req.model_dump_json()
            )
            
            workflow_params = ScriptGenWorkflowParams(
                resquest_info=header,
                task_id=new_task.id,
                text=new_req.text,
                voice=new_req.voice,
                urls=new_req.urls,
                stage=new_req.stage,
                language=new_req.language,
                question_extract=False
            )
            await client.start_workflow(
                ScriptGenWorkflow,
                workflow_params,
                id=workflow_id,
                task_queue=config.tasks.question_explanation_video_gen_script.task_queue
            )

            await workspace_dal.create_script_relation(
                user_id=header.user_id,
                script_task_id=new_task.id,
                folder_id=req.folder_id
            )

    return BaseResponse()


class DeleteQuestionExtractConfirmReq(BaseModel):
    confirm_id: str = Field(..., description="ScriptQuestionsExtractConfirm ID")

@router.delete("", response_model=BaseResponse)
async def api_delete_question_extract_confirm(
    header: HeaderInfo,
    session: DBSession,
    req: DeleteQuestionExtractConfirmReq
):
    async with session.begin():
        confirm = await session.get(ScriptQuestionsExtractConfirm, req.confirm_id)
        if not confirm or confirm.user_id != header.user_id:
            raise NotFoundException.NotFound("Confirm record not found")

        confirm.activate = False
        session.add(confirm)

        if confirm.extract_question_task_id:
            stmt1 = (
                update(QuestionExtractTask)
                .where(
                    QuestionExtractTask.id == confirm.extract_question_task_id,
                    QuestionExtractTask.user_id == header.user_id
                )
                .values(activate=False)
            )
            await session.execute(stmt1)

        if confirm.script_task_id:
            stmt2 = (
                update(QuestionExplanationVideoGenScriptTask)
                .where(
                    QuestionExplanationVideoGenScriptTask.id == confirm.script_task_id,
                    QuestionExplanationVideoGenScriptTask.user_id == header.user_id
                )
                .values(activate=False)
            )
            await session.execute(stmt2)

    return BaseResponse()
