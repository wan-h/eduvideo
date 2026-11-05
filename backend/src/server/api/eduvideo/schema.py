# -*- coding: utf-8 -*-
'''
@File    :   schema.py
@Author  :   一力辉
'''

from enum import StrEnum
from datetime import datetime
from pydantic import BaseModel, Field
from src.schema import TASK_STATUS
from src.server.schema.request import BaseResponse

class BaseTaskInfo(BaseModel):
    id: str = Field(..., description="任务ID")
    status: TASK_STATUS = Field(..., description="任务状态")
    progress: int = Field(..., description="任务进度")
    message: str = Field("", description="任务信息")
    created_at: datetime = Field(..., description="创建时间")

class ScriptTaskInfo(BaseTaskInfo):
    text: str = Field(..., description="用户输入文本内容")
    title: str = Field(..., description="用户输入问题标题")
class ScriptTaskListResp(BaseResponse):
    class ScriptTaskListDesc(BaseModel):
        infos: list[ScriptTaskInfo] = Field([], description="任务列表")
        total: int = Field(..., description="任务总数")
    
    data: ScriptTaskListDesc

class SynthesisTaskInfo(BaseTaskInfo):
        video_url: str = Field(..., description="合成视频链接")
class  SynthesisTaskListResp(BaseResponse):
    class SynthesisTaskListDesc(BaseModel):
        infos: list[SynthesisTaskInfo] = Field([], description="任务列表")
        total: int = Field(..., description="任务总数")
    data: SynthesisTaskListDesc
