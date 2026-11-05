# -*- coding: utf-8 -*-
"""
@File    : schema.py
@Author  : 一力辉
"""

from pydantic import BaseModel, Field

class FileDesc(BaseModel):
    content: bytes = Field(..., description="文件内容")
    s3_url: str = Field(..., description="s3 url")
    filename: str = Field(..., description="文件名")
    content_type: str = Field(..., description="文件内容类型")

class BaseWorkflowParams(BaseModel):
    is_internal: bool = Field(False, description="是否为内部调用，内部调用时不更新任务状态")