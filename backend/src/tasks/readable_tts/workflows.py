# -*- coding: utf-8 -*-
"""
@File    : workflows.py
@Author  : 一力辉
"""


from temporalio import workflow
from temporalio.common import RetryPolicy


with workflow.unsafe.imports_passed_through():
    import asyncio
    import pydantic_core
    import math
    from src.utils import config, logger
    from src.schema import TASK_TYPE, TASK_STATUS, LANGUAGE_TYPE, RequestInfo
    from src.tasks.readable_tts.utils import contains_latex
    from src.tasks.readable_tts.schema import Text2SpeechParams, ChineseReadableTranslateParams, LatexReadableTranslateParams, \
        ReadableTTSWorkflowParams, ReadableTTSWorkflowResult
    from src.tasks.readable_tts.activities import chinese_readable_translate, text_to_speech, latex_readable_translate
    from src.tasks.base.workflows import BaseWorkflow


@workflow.defn
class ReadableTTSWorkflow(BaseWorkflow):
    @workflow.run
    async def run(self, params: ReadableTTSWorkflowParams) -> ReadableTTSWorkflowResult:
        await self._update_task_status(
            request_info=params.resquest_info,
            task_id=params.task_id,
            task_type=TASK_TYPE.READABLE_TTS,
            status=TASK_STATUS.PENDING,
            message="正在排队等待语音合成节点...",
            progress=0,
            is_internal=params.is_internal
        )
        try:
            translate_text = params.text
            if not params.skip_translate:
                # 中文可读性翻译
                if params.language == LANGUAGE_TYPE.CHINESE:
                    translate_text = await workflow.execute_activity(
                        chinese_readable_translate,
                        ChineseReadableTranslateParams(
                            resquest_info=params.resquest_info,
                            text=params.text,
                            subject=params.subject,
                        ),
                        start_to_close_timeout=workflow.timedelta(minutes=config.tasks.readable_tts.start_to_close_timeout),
                        retry_policy=RetryPolicy(
                            initial_interval=workflow.timedelta(seconds=config.tasks.readable_tts.retry_config.initial_interval),
                            maximum_interval=workflow.timedelta(seconds=config.tasks.readable_tts.retry_config.maximum_interval),
                            maximum_attempts=config.tasks.readable_tts.retry_config.maximum_attempts,
                        )
                    )
                    workflow.logger.debug(f"[Text2SpeechWorkflow] chinese translate result: {translate_text}")
                # latex可读性翻译
                if contains_latex(params.text):
                    translate_text = await workflow.execute_activity(
                        latex_readable_translate,
                        LatexReadableTranslateParams(
                            resquest_info=params.resquest_info,
                            text=params.text,
                            subject=params.subject,
                        ),
                        start_to_close_timeout=workflow.timedelta(minutes=config.tasks.readable_tts.start_to_close_timeout),
                        retry_policy=RetryPolicy(
                            initial_interval=workflow.timedelta(seconds=config.tasks.readable_tts.retry_config.initial_interval),
                            maximum_interval=workflow.timedelta(seconds=config.tasks.readable_tts.retry_config.maximum_interval),
                            maximum_attempts=config.tasks.readable_tts.retry_config.maximum_attempts,
                        )
                    )
                    workflow.logger.debug(f"[Text2SpeechWorkflow] latex translate result: {translate_text}")
            # 获取当前workflow的task_id
            workflow_id = workflow.info().workflow_id
            # 文本转语音
            result = await workflow.execute_activity(
                text_to_speech,
                Text2SpeechParams(
                    resquest_info=params.resquest_info,
                    task_id=params.task_id, 
                    workflow_id=workflow_id,
                    text=translate_text, 
                    voice=params.voice, 
                    speed=params.speed,
                    language=params.language,
                    subject=params.subject,
                ),
                start_to_close_timeout=workflow.timedelta(minutes=config.tasks.readable_tts.start_to_close_timeout),
                retry_policy=RetryPolicy(
                    initial_interval=workflow.timedelta(seconds=config.tasks.readable_tts.retry_config.initial_interval),
                    maximum_interval=workflow.timedelta(seconds=config.tasks.readable_tts.retry_config.maximum_interval),
                    maximum_attempts=config.tasks.readable_tts.retry_config.maximum_attempts,
                )
            )
            workflow.logger.debug(f"[Text2SpeechWorkflow] text to speech result: {result}")
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.READABLE_TTS,
                status=TASK_STATUS.SUCCESS,
                progress=100,
                message="Task completed",
                result=result.model_dump_json(),
                is_internal=params.is_internal
            )
            return ReadableTTSWorkflowResult(**result.model_dump())
        except (Exception, asyncio.CancelledError) as e:
            is_cancelled = isinstance(e, asyncio.CancelledError)
            target_status = TASK_STATUS.REVOKED if is_cancelled else TASK_STATUS.FAILURE
            err_msg = "Task was canceled" if is_cancelled else f"Task failed: {self._get_exception_message(e)}"
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.READABLE_TTS,
                status=target_status,
                progress=0,
                message=err_msg,
                is_internal=params.is_internal
            )
            raise e