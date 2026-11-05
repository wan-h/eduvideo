# -*- coding: utf-8 -*-
"""
@File    : workflows.py
@Author  : 一力辉
"""

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    import asyncio
    from src.utils import config, logger
    from src.schema import TASK_TYPE, TASK_STATUS, RequestInfo
    from src.tasks.base.workflows import BaseWorkflow
    from src.tasks.question_parse.schema import (
        QuestionParseParams,
        QuestionParseWorkflowParams,
        QuestionParseWorkflowResult,
    )
    from src.tasks.question_parse.activities import question_parse


@workflow.defn
class QuestionParseWorkflow(BaseWorkflow):
    @workflow.run
    async def run(self, params: QuestionParseWorkflowParams) -> QuestionParseWorkflowResult:
        await self._update_task_status(
            request_info=params.resquest_info,
            task_id=params.task_id,
            task_type=TASK_TYPE.QUESTION_PARSE,
            status=TASK_STATUS.PENDING,
            message="正在排队等待题目解析节点...",
            progress=0,
            is_internal=params.is_internal
        )
        try:
            # 问题解析
            result = await workflow.execute_activity(
                question_parse,
                QuestionParseParams(
                    question_text=params.question_text,
                    stage=params.stage,
                    language=params.language,
                ),
                start_to_close_timeout=workflow.timedelta(minutes=config.tasks.question_parse.start_to_close_timeout),
                retry_policy=RetryPolicy(
                    initial_interval=workflow.timedelta(seconds=config.tasks.question_parse.retry_config.initial_interval),
                    maximum_interval=workflow.timedelta(seconds=config.tasks.question_parse.retry_config.maximum_interval),
                    maximum_attempts=config.tasks.question_parse.retry_config.maximum_attempts,
                )
            )
            workflow.logger.debug(f"[QuestionParseWorkflow] question_parse result: {result}")
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_PARSE,
                status=TASK_STATUS.SUCCESS,
                progress=100,
                message="Task completed",
                result=result.model_dump_json(),
                is_internal=params.is_internal
            )
            return QuestionParseWorkflowResult(**result.model_dump())
        except (Exception, asyncio.CancelledError) as e:
            is_cancelled = isinstance(e, asyncio.CancelledError)
            target_status = TASK_STATUS.REVOKED if is_cancelled else TASK_STATUS.FAILURE
            err_msg = "Task was canceled" if is_cancelled else f"Task failed: {self._get_exception_message(e)}"
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_PARSE,
                status=target_status,
                progress=0,
                message=err_msg,
                is_internal=params.is_internal
            )
            raise e
