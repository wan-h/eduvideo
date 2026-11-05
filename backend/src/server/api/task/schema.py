# -*- coding: utf-8 -*-
'''
@File    :   shema.py
@Author  :   一力辉
'''

from datetime import datetime
from src.schema import TASK_STATUS
from pydantic import BaseModel, Field
from src.server.schema.request import BaseResponse

class TaskSubmitResp(BaseResponse):
    data: str = Field(..., description="任务id")

class TaskInfoResp(BaseResponse):
    class TaskInfo(BaseModel):
        id: str = Field(..., description="任务id")
        request: str = Field(..., description="任务请求信息")
        status: TASK_STATUS = Field(..., description="任务状态")
        progress: int = Field(..., description="任务进度")
        result: str = Field("", description="任务结果")
        message: str = Field("", description="任务信息")
        created_at: datetime = Field(..., description="创建时间")

    data: TaskInfo = Field(..., description="任务状态")