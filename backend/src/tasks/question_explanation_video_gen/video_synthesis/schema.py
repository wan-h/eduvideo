# -*- coding: utf-8 -*-
"""
@File    : schema.py
@Author  : 一力辉
"""


from src.tasks.schema import BaseWorkflowParams
from src.tasks.question_explanation_video_gen.script_gen.schema import ScriptGenReq
from src.server.schema.eduvideo import VideoScriptDesc, VideoExportDesc
from pydantic import BaseModel, Field

from src.schema import RequestInfo

class VideoSynthesisReq(BaseModel):
    video_script_desc: VideoScriptDesc
    video_export_desc: VideoExportDesc

class VideoSynthesisParams(VideoSynthesisReq):
    resquest_info: RequestInfo
    task_id: str

class VideoSynthesisResult(BaseModel):
    video_url: str

class VideoSynthesisWorkflowParams(VideoSynthesisParams, BaseWorkflowParams):
    ...

class VideoSynthesisWorkflowResult(VideoSynthesisResult):
    ...

class ScriptVideoSynthesisParams(ScriptGenReq):
    video_export_desc: VideoExportDesc

class ScriptVideoSynthesisReq(ScriptVideoSynthesisParams):
    script_task_id: str = Field("", description="脚本生成任务 ID")
    synthesis_task_id: str = Field("", description="视频合成任务 ID")

class ScriptVideoSynthesisWorkflowParams(ScriptVideoSynthesisReq, BaseWorkflowParams):
    resquest_info: RequestInfo
    task_id: str

class ScriptVideoSynthesisWorkflowResult(BaseModel):
    # video_script: VideoScriptDesc
    video_url: str

class RemotionScriptInput(VideoScriptDesc):
    video_settings: VideoExportDesc