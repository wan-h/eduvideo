# -*- coding: utf-8 -*-
'''
@File    :   utils.py
@Author  :   一力辉
'''

from src.schema import LANGUAGE_TYPE, VOICE_TYPE
from src.utils import config

# Dynamically construct VOICE_MAP from configuration
VOICE_MAP = {
    sample.voice_type: (
        sample.model_id,
        sample.url,
        sample.title,
        sample.language
    )
    for sample in config.product.eduvideo.voice_samples
}

VOICE_LABELS_EN = {
    "普通话女声": "Mandarin Female",
    "普通话男声": "Mandarin Male",
    "美英女声": "American English Female",
    "美英男声": "American English Male",
    "英英女声": "British English Female",
    "英英男声": "British English Male",
}

get_voice_id = lambda voice_type: VOICE_MAP[voice_type][0]
get_voice_url = lambda voice_type: VOICE_MAP[voice_type][1]

def get_voice_label(voice_type: str, language: str = "zh-CN") -> str:
    raw_title = VOICE_MAP[voice_type][2]
    if language == "en":
        return VOICE_LABELS_EN.get(raw_title, raw_title)
    return raw_title

get_voice_language = lambda voice_type: VOICE_MAP[voice_type][3]

def get_default_tts_voice_type(language: LANGUAGE_TYPE) -> str:
    """根据传入的音色名称或ID，解析出真实的voice ID，留空则按语言自动分配"""
    if language == LANGUAGE_TYPE.ENGLISH:
        return VOICE_TYPE.EN_FEMALE_AMERICAN
    return VOICE_TYPE.ZH_FEMALE_PUTONGHUA

def get_default_tts_voice_id(language: LANGUAGE_TYPE) -> str:
    """根据传入的音色名称或ID，解析出真实的voice ID，留空则按语言自动分配"""
    voice_type = get_default_tts_voice_type(language)
    return get_voice_id(voice_type)

def get_voice_model_id(voice: str, language: LANGUAGE_TYPE) -> str:
    if not voice:
        return get_default_tts_voice_id(language)
    return get_voice_id(voice)