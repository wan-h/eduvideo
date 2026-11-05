# -*- coding: utf-8 -*-
"""
@File    : schema.py
@Author  : 一力辉
"""

from pydantic import BaseModel, Field
from src.schema import QUESTION_TYPE, RequestInfo
from src.tasks.schema import BaseWorkflowParams
from src.tasks.doc_parse.schema import DocParseResult

class QuestionInfo(BaseModel):
    image: str = Field(..., description="题目截图信息")
    question_number: int | None = Field(None, description="题号；无题号时为 null")
    question_type: QUESTION_TYPE = Field(..., description="题目类型")
    content: str = Field(..., description="题目完整内容（markdown 格式）")
    bbox: list | dict | None = Field(None, description="题目在原文档中的位置框（千分比坐标）")

class QuestionExtractFromDocParams(BaseModel):
    resquest_info: RequestInfo = Field(..., description="请求信息")
    task_id: str = Field(..., description="任务 id")
    source_urls: list[str] = Field(..., description="原始文件 URL 列表（与 doc_parse_results 一一对应）")
    doc_parse_results: list[DocParseResult] = Field(..., description="文档解析结果列表")

class LLMQuestionGroup(BaseModel):
    """LLM 直接输出的题目分组（含 block_ids，用于后处理还原内容）"""
    question_number: int | None = Field(None, description="题号；无题号时为 null")
    question_type: QUESTION_TYPE = Field(..., description="题目类型")
    block_ids: list[str] = Field(..., description="属于本题的 block id 列表")

class LLMExtractResult(BaseModel):
    """instructor response_model：LLM 原始分组结果"""
    groups: list[LLMQuestionGroup] = Field([], description="LLM 分组列表")



class QuestionExtractFromDocResult(BaseModel):
    questions: list[QuestionInfo] = Field([], description="提取出的题目列表")
    total: int = Field(..., description="题目总数")

class QuestionExtractReq(BaseModel):
    urls: list[str] = Field(..., description="文件 url 或 url 列表")
    
class QuestionExtractParams(QuestionExtractReq):
    resquest_info: RequestInfo = Field(..., description="请求信息")
    task_id: str = Field(..., description="任务 id")

class QuestionExtractWorkflowParams(QuestionExtractParams, BaseWorkflowParams):
    ...


class QuestionExtractWorkflowResult(QuestionExtractFromDocResult):
    ...
