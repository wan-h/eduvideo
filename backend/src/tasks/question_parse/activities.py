# -*- coding: utf-8 -*-
"""
@File    : activities.py
@Author  : 一力辉
"""

import json
import instructor
from instructor.processing.function_calls import _validate_model_from_json
from json_repair import repair_json
from openai import AsyncOpenAI
from temporalio import activity
from src.utils import config, logger
from src.tasks.utils import replace_image_url, download_file
from src.tasks.question_parse.prompts import Prompts
from src.tasks.question_parse.schema import QuestionParseParams, QuestionParseResult

_original_validate = _validate_model_from_json

def _safe_validate_model_from_json(cls, json_content, validation_context, strict):
    if isinstance(json_content, str):
        try:
            return _original_validate(cls, json_content, validation_context, strict)
        except Exception:
            # 用 json-repair 修复后再验证
            fixed = repair_json(json_content)
            return _original_validate(cls, fixed, validation_context, strict)
    return _original_validate(cls, json_content, validation_context, strict)

instructor.processing.function_calls._validate_model_from_json = _safe_validate_model_from_json


@activity.defn
async def question_parse(params: QuestionParseParams) -> QuestionParseResult:
    """解析用户上传的信息，提取问题的结构化信息"""
    # 提示词
    prompt = Prompts.get_question_parse_prompt(params.question_text, params.stage, params.language)
    # 图片内容处理
    message_content = [
        {'type': 'text', 'text': prompt}
    ]
    
    client = instructor.from_openai(
        AsyncOpenAI(
            base_url=config.tasks.question_parse.parser.base_url,
            api_key=config.tasks.question_parse.parser.api_key,
        ),
        mode=instructor.Mode.JSON
    )

    resp = await client.chat.completions.create(
        messages=[{"role": "user", "content": message_content}],
        response_model=QuestionParseResult,
        model=config.tasks.question_parse.parser.model,
        max_retries=config.tasks.max_retries
    )

    logger.debug(f"[question_parse] parse result: {resp}")

    return resp
