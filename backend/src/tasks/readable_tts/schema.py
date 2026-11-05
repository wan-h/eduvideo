# -*- coding: utf-8 -*-
'''
@File    :   protocol.py
@Author  :   一力辉
'''

from pydantic import BaseModel
from enum import StrEnum
from src.tasks.schema import BaseWorkflowParams
from src.schema import SUBJECT_TYPE, LANGUAGE_TYPE, RequestInfo

class TTS_MODEL_TYPE(StrEnum):
    FISH = "fish"
    MINIMAX = "minimax"

class ChineseReadableTranslateParams(BaseModel):
    resquest_info: RequestInfo
    text: str
    subject: SUBJECT_TYPE

class LatexReadableTranslateParams(BaseModel):
    resquest_info: RequestInfo
    text: str
    subject: SUBJECT_TYPE

class Text2SpeechParams(BaseModel):
    resquest_info: RequestInfo
    task_id: str
    workflow_id: str
    text: str
    voice: str
    speed: float = 1.0
    language: LANGUAGE_TYPE
    subject: SUBJECT_TYPE

class Text2SpeechResult(BaseModel):
    url: str
    # 经过可读性翻译后的文本
    text: str
    duration: int

class ReadableTTSReq(BaseModel):
    text: str
    voice: str
    speed: float = 1.0
    subject: SUBJECT_TYPE
    language: LANGUAGE_TYPE
    skip_translate: bool = False

class ReadableTTSWorkflowParams(ReadableTTSReq, BaseWorkflowParams):
    resquest_info: RequestInfo
    task_id: str
    

class ReadableTTSWorkflowResult(Text2SpeechResult):
    ...