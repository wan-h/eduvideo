# -*- coding: utf-8 -*-
"""
@File    : activities.py
@Author  : 一力辉
"""

import instructor
from instructor.processing.function_calls import _validate_model_from_json
from json_repair import repair_json
from openai import AsyncOpenAI
from temporalio import activity
from src.utils import config, logger
from src.tasks.utils import build_image_content_parts
from .prompts import Prompts
from .schema import QuestionSolveParams, QuestionSolveResult

_original_validate = _validate_model_from_json

def _safe_validate_model_from_json(cls, json_content, validation_context, strict):
    if isinstance(json_content, str):
        try:
            return _original_validate(cls, json_content, validation_context, strict)
        except Exception:
            fixed = repair_json(json_content)
            return _original_validate(cls, fixed, validation_context, strict)
    return _original_validate(cls, json_content, validation_context, strict)

instructor.processing.function_calls._validate_model_from_json = _safe_validate_model_from_json


@activity.defn
async def question_solve(params: QuestionSolveParams) -> QuestionSolveResult:
    """问题求解"""
    system_prompt = Prompts.get_question_solve_prompt(
        subject=params.subject, 
        stage=params.stage, 
        language=params.language
    )
    message_content = [
        {'type': 'text', 'text': params.question_text if params.question_text.strip() else "请给出图中问题的解答"},
    ] + await build_image_content_parts(params.question_images)
    client = instructor.from_openai(
        AsyncOpenAI(
            base_url=config.tasks.question_solve.solver.base_url,
            api_key=config.tasks.question_solve.solver.api_key,
        ),
        mode=instructor.Mode.JSON,
    )
    resp = await client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message_content}
        ],
        response_model=QuestionSolveResult,
        model=config.tasks.question_solve.solver.model,
        max_retries=config.tasks.max_retries,
    )
    logger.debug(f"[question_solve] solve result: {resp}")
    return resp
