# -*- coding: utf-8 -*-
"""
@File    : dal.py
@Author  : 一力辉
"""

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update, select
from src.server.depends import register_dal
from src.server.models.task import BaseTask, DocParseTask, ReadableTtsTask, \
    QuestionExtractTask, \
    QuestionExplanationVideoGenScriptTask, QuestionExplanationVideoGenSynthesisTask, QuestionExplanationVideoGenScriptSynthesisTask, QuestionSolveTask, QuestionParseTask
from src.server.dal.base import BaseDatabaseDAL
from src.schema import TASK_STATUS, TASK_TYPE
from typing import TypeVar, Generic, Type

T = TypeVar('T', bound=BaseTask)

class TaskDAL(BaseDatabaseDAL, Generic[T]):
    model: Type[T]

    async def create(
        self,
        user_id: str,
        workflow_id: str,
        request: str,
        progress: int = 0,
        result: str = "",
        message: str = "",
        status: TASK_STATUS = TASK_STATUS.PENDING,
        activate: bool = True
    ) -> T:
        task = self.model(
            user_id=user_id,
            workflow_id=workflow_id,
            request=request,
            progress=progress,
            result=result,
            message=message,
            status=status,
            activate=activate
        )
        self.session.add(task)
        await self.session.flush()
        return task

    async def query_by_id(
        self,
        id: str,
        user_id: str
    ) -> T | None:
        query = select(self.model).where(
            self.model.id == id, 
            self.model.user_id == user_id,
            self.model.activate == True
        )
        result = await self.session.execute(query)
        task = result.scalar()
        return task
    
    async def query_by_user_id(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> list[T]:
        query = select(self.model).where(
            self.model.user_id == user_id, 
            self.model.activate == True
        ).order_by(self.model.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def update_by_id(
        self,
        id: str,
        user_id: str,
        progress: int | None = None,
        result: str | None = None,
        message: str | None = None,
        status: TASK_STATUS | None = None,
    ) -> T | None:
        update_values = {}
        if status is not None:
            update_values["status"] = status
        if progress is not None:
            update_values["progress"] = progress
        if result is not None:
            update_values["result"] = result
        if message is not None:
            update_values["message"] = message

        if not update_values:
            stmt = select(self.model).where(
                self.model.id == id, 
                self.model.user_id == user_id,
                self.model.activate == True
            )
            res = await self.session.execute(stmt)
            return res.scalar()

        stmt = (
            update(self.model)
            .where(
                self.model.id == id, 
                self.model.activate == True
            )
            .values(**update_values)
            .returning(self.model)
        )
        if user_id is not None:
            stmt = stmt.where(self.model.user_id == user_id)
        
        res = await self.session.execute(stmt)
        await self.session.flush()
        updated= res.scalar()
        return updated

    async def delete_by_id(
        self,
        id: str,
        user_id: str
    ) -> T | None:
        stmt = (
            update(self.model)
            .where(
                self.model.id == id, 
                self.model.user_id == user_id,
                self.model.activate == True
            )
            .values(
                activate=False,
                deleted_at=datetime.now()
            )
            .returning(self.model)
        )
        res = await self.session.execute(stmt)
        await self.session.flush()
        return res.scalar()

    async def count_by_user_id(
        self,
        user_id: str
    ) -> int:
        from sqlalchemy import func
        query = select(func.count(self.model.id)).where(
            self.model.user_id == user_id,
            self.model.activate == True
        )
        result = await self.session.execute(query)
        return result.scalar() or 0

@register_dal
class DocParseTaskDAL(TaskDAL[DocParseTask]):
    model = DocParseTask

@register_dal
class ReadableTTSTaskDAL(TaskDAL[ReadableTtsTask]):
    model = ReadableTtsTask

@register_dal
class QuestionExplanationVideoGenScriptTaskDAL(TaskDAL[QuestionExplanationVideoGenScriptTask]):
    model = QuestionExplanationVideoGenScriptTask

@register_dal
class QuestionExplanationVideoGenSynthesisTaskDAL(TaskDAL[QuestionExplanationVideoGenSynthesisTask]):
    model = QuestionExplanationVideoGenSynthesisTask

@register_dal
class QuestionExtractTaskDAL(TaskDAL[QuestionExtractTask]):
    model = QuestionExtractTask

@register_dal
class QuestionExplanationVideoGenScriptSynthesisTaskDAL(TaskDAL[QuestionExplanationVideoGenScriptSynthesisTask]):
    model = QuestionExplanationVideoGenScriptSynthesisTask

@register_dal
class QuestionSolveTaskDAL(TaskDAL[QuestionSolveTask]):
    model = QuestionSolveTask

@register_dal
class QuestionParseTaskDAL(TaskDAL[QuestionParseTask]):
    model = QuestionParseTask


TASK_DAL_MAP = {
    TASK_TYPE.DOC_PARSE: DocParseTaskDAL,
    TASK_TYPE.READABLE_TTS: ReadableTTSTaskDAL,
    TASK_TYPE.QUESTION_EXTRACT: QuestionExtractTaskDAL,
    TASK_TYPE.QUESTION_SOLVE: QuestionSolveTaskDAL,
    TASK_TYPE.QUESTION_PARSE: QuestionParseTaskDAL,
    TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT: QuestionExplanationVideoGenScriptTaskDAL,
    TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS: QuestionExplanationVideoGenSynthesisTaskDAL,
    TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT_SYNTHESIS: QuestionExplanationVideoGenScriptSynthesisTaskDAL,
}

def get_task_dal(task_type: TASK_TYPE, session: AsyncSession) -> TaskDAL:
    dal_cls = TASK_DAL_MAP.get(task_type)
    if not dal_cls:
        raise ValueError(f"Unsupported task type: {task_type}")
    return dal_cls(session)