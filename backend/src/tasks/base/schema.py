# -*- coding: utf-8 -*-
"""
@File    : schema.py
@Author  : 一力辉
"""

from pydantic import BaseModel, Field
from src.schema import TASK_TYPE, TASK_STATUS, RequestInfo

class TaskStatusUpdateParams(BaseModel):
    resquest_info: RequestInfo = Field(..., description="请求信息")
    task_id: str = Field(..., description="任务ID")
    task_type: TASK_TYPE = Field(..., description="任务类型")
    status: TASK_STATUS | None = Field(..., description="任务状态")
    result: str | None = Field(None, description="任务结果，成功时为结果内容，失败时为错误信息")
    message: str | None = Field(None, description="任务信息")
    progress: int | None = Field(None, description="任务进度")