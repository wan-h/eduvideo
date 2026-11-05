# -*- coding: utf-8 -*-
"""
@File    : schema.py
@Author  : 一力辉
"""

from pydantic import BaseModel, Field
from src.schema import LANGUAGE_TYPE, STAGE_TYPE, QUESTION_TYPE, SUBJECT_TYPE, RequestInfo
from src.tasks.schema import BaseWorkflowParams

class QuestionParseParams(BaseModel):
    question_text: str = Field(..., description="题目内容")
    stage: STAGE_TYPE
    language: LANGUAGE_TYPE

class QuestionParseResult(BaseModel):
    class QuestionContent(BaseModel):
        stem: str = Field(..., description="题干内容")
        options: list[str] = Field([], description="选择题的选项列表，问答题为空列表")

    title: str = Field(..., description="题目标题")
    question_type: QUESTION_TYPE = Field(..., description="题目类型")
    question_content: QuestionContent = Field(..., description="题目内容")
    subject: SUBJECT_TYPE = Field(..., description="题目学科")
    knowledge_points: list[str] = Field(..., description="题目涉及到的知识点列表")

class QuestionParseReq(BaseModel):
    question_text: str = Field(..., description="题目内容")
    stage: STAGE_TYPE
    language: LANGUAGE_TYPE

class QuestionParseWorkflowParams(QuestionParseReq, BaseWorkflowParams):
    resquest_info: RequestInfo
    task_id: str

class QuestionParseWorkflowResult(QuestionParseResult):
    ...
