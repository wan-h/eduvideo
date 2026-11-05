# -*- coding: utf-8 -*-
"""
@File    : schema.py
@Author  : 一力辉
"""

from pydantic import BaseModel, Field
from src.schema import RequestInfo
from src.tasks.schema import BaseWorkflowParams

class DocParseReq(BaseModel):
    url: str = Field(..., description="文件url")

class DocParseParams(DocParseReq):
    resquest_info: RequestInfo = Field(..., description="请求信息")
    task_id: str = Field(..., description="任务id")

class DocParseResult(BaseModel):
    source_url: str = Field("", description="原始文档 URL")
    md_content: str = Field(..., description="markdown内容")
    content_list_v1: str = Field(..., description="内容列表json")
    content_list_v2: str = Field(..., description="内容列表json")
    middle_json: str = Field(..., description="内容列表json")
    model_output: str = Field(..., description="模型输出")
    images: dict[str, str] = Field(..., description="图片列表")
    page_count: int = Field(1, description="文档页数，PDF 为实际页数，图片固定为 1")

class DocParseWorkflowParams(DocParseParams, BaseWorkflowParams):
    ...

class DocParseWorkflowResult(DocParseResult):
    ...