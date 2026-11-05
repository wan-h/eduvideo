# -*- coding: utf-8 -*-
"""
@File    : activities.py
@Author  : 一力辉
"""

import base64
from io import BytesIO
from pydub import AudioSegment
from openai import AsyncOpenAI
from temporalio import activity
from src.schema import SUBJECT_TYPE, LANGUAGE_TYPE
from src.utils import config, logger
from src.tasks.utils import upload_file
from .schema import ChineseReadableTranslateParams, Text2SpeechParams, LatexReadableTranslateParams, Text2SpeechResult
from .prompts import Prompts
from .utils import is_all_chinese, provider_tts


@activity.defn
async def chinese_readable_translate(params: ChineseReadableTranslateParams) -> str:
    """
    输入转换为可读的字符串
    """
    # 发音映射
    # if params.subject not in [SUBJECT_TYPE.MATH, SUBJECT_TYPE.CHEMISTRY, SUBJECT_TYPE.PHYSICS]:
    #     return ChineseReadableTranslateResult(
    #         result=params.text, 
    #         pronunciation_map=PronunciationMap(minimax=params.text, fish=params.text)
    #     )

    # merged_dict = VOCABULARY_MAPPING_TABLE_DEFAULT.copy()
    # match params.subject:
    #     case SUBJECT_TYPE.CHEMISTRY:
    #         merged_dict.update(VOCABULARY_MAPPING_TABLE_CHEMISTRY)
    #     case SUBJECT_TYPE.MATH:
    #         merged_dict.update(VOCABULARY_MAPPING_TABLE_MATH)
    #     case _:
    #         pass
    # pronunciation_dict = merged_dict

    # if is_all_chinese(params.text) and all(t not in pronunciation_dict for t in params.text):
    #     # 不需翻译的简单句子直接返回
    #     return ChineseReadableTranslateResult(
    #         result=params.text, 
    #         pronunciation_map=PronunciationMap(minimax=params.text, fish=params.text)
    #     )
    
    if is_all_chinese(params.text):
        # 不需翻译的简单句子直接返回
        return params.text
    
    client = AsyncOpenAI(
        base_url=config.tasks.readable_tts.chinese_translate.base_url,
        api_key=config.tasks.readable_tts.chinese_translate.api_key,
    )

    completion = await client.chat.completions.create(
        model=config.tasks.readable_tts.chinese_translate.model,
        messages=[
            {"role": "system", "content": Prompts.get_chinese_readable(params.subject)},
            {"role": "user", "content": f"翻译句子：{params.text}"},
        ],
        stream=False,
    )
    result = completion.choices[0].message.content
    # 将所有小写字母转为大写
    result = result.upper().strip() if result is not None else ""
    logger.debug(f"[readable_tts](chinese_readable_translate) translation completed: {result}")

    return result

@activity.defn
async def latex_readable_translate(params: LatexReadableTranslateParams) -> str:
    client = AsyncOpenAI(
        base_url=config.tasks.readable_tts.latex_translate.base_url,
        api_key=config.tasks.readable_tts.latex_translate.api_key,
    )

    completion = await client.chat.completions.create(
        model=config.tasks.readable_tts.latex_translate.model,
        messages=[
            {"role": "system", "content": Prompts.get_latex_readable()},
            {"role": "user", "content": f"翻译句子：{params.text}"},
        ],
        stream=False,
        # stream_options={"include_usage": True}
    )
    result = completion.choices[0].message.content
    # 将所有小写字母转为大写
    result = result if result is not None else ""
    logger.debug(f"[readable_tts](latex_readable_translate) translation completed: {result}")

    return result

@activity.defn
async def text_to_speech(params: Text2SpeechParams) -> Text2SpeechResult:
    audio_bytes = b''
    match params.language:
        case LANGUAGE_TYPE.CHINESE:
            audio_bytes = await provider_tts(
                provider=config.tasks.readable_tts.chinese.provider,
                subject_type=params.subject,
                model=config.tasks.readable_tts.chinese.model,
                base_url=config.tasks.readable_tts.chinese.base_url,
                api_key=config.tasks.readable_tts.chinese.api_key,
                text=params.text,
                voice=params.voice,
                spped=params.speed,
            )
        case LANGUAGE_TYPE.ENGLISH:
            audio_bytes = await provider_tts(
                provider=config.tasks.readable_tts.english.provider,
                subject_type=params.subject,
                model=config.tasks.readable_tts.english.model,
                base_url=config.tasks.readable_tts.english.base_url,
                api_key=config.tasks.readable_tts.english.api_key,
                text=params.text,
                voice=params.voice,
                spped=params.speed,
            )

    mp3_bytes_io = BytesIO(audio_bytes)
    # 获取音频的时长(ms)
    audio_segment = AudioSegment.from_mp3(mp3_bytes_io)
    duration_ms = len(audio_segment) 
    logger.debug(f"[readable_tts](text_to_speech) audio generated, ms: {duration_ms}")
    url = await upload_file(
        user_id=params.resquest_info.user_id,
        task_id=params.task_id,
        file_name=f"{params.workflow_id}.mp3",
        file_data=audio_bytes,
        metadata={
            "duration": str(duration_ms),
            "text": base64.b64encode(params.text.encode('utf-8')).decode('ascii'),
        }
    )
    logger.debug(f"[readable_tts](text_to_speech) audio uploaded: {url}")
    return Text2SpeechResult(url=url, duration=duration_ms, text=params.text)