# -*- coding: utf-8 -*-
"""
@File    : schema.py
@Author  : 一力辉
"""

from pydantic import BaseModel, Field
from src.schema import LANGUAGE_TYPE, STAGE_TYPE, SUBJECT_TYPE, QUESTION_DIFFICULTY_LEVEL_TYPE, RequestInfo
from src.tasks.schema import BaseWorkflowParams

class QuestionSolveParams(BaseModel):
    question_text: str
    question_images: list[str]
    subject: SUBJECT_TYPE
    stage: STAGE_TYPE
    language: LANGUAGE_TYPE

class QuestionSolveResult(BaseModel):
    level: QUESTION_DIFFICULTY_LEVEL_TYPE = Field(..., description="题目难度")
    solution: str = Field(..., description="题目解答内容，包含解答过程和最终答案")

class QuestionSolveReq(QuestionSolveParams):
    ...

class QuestionSolveWorkflowParams(QuestionSolveReq, BaseWorkflowParams):
    resquest_info: RequestInfo
    task_id: str

class QuestionSolveWorkflowResult(QuestionSolveResult):
    ...
