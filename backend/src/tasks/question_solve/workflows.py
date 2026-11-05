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
    from src.utils import config, logger
    from src.schema import TASK_TYPE, TASK_STATUS, RequestInfo
    from src.tasks.question_solve.schema import QuestionSolveParams, QuestionSolveWorkflowParams, QuestionSolveWorkflowResult
    from src.tasks.question_solve.activities import question_solve
    from src.tasks.base.workflows import BaseWorkflow


@workflow.defn
class QuestionSolveWorkflow(BaseWorkflow):
    @workflow.run
    async def run(self, params: QuestionSolveWorkflowParams) -> QuestionSolveWorkflowResult:
        await self._update_task_status(
            request_info=params.resquest_info,
            task_id=params.task_id,
            task_type=TASK_TYPE.QUESTION_SOLVE,
            status=TASK_STATUS.PENDING,
            message="正在排队等待题目求解节点...",
            progress=0,
            is_internal=params.is_internal
        )
        try:
            # 问题求解
            result = await workflow.execute_activity(
                question_solve,
                QuestionSolveParams(
                    question_text=params.question_text,
                    question_images=params.question_images,
                    subject=params.subject,
                    stage=params.stage,
                    language=params.language,
                ),
                start_to_close_timeout=workflow.timedelta(minutes=config.tasks.question_solve.start_to_close_timeout),
                retry_policy=RetryPolicy(
                    initial_interval=workflow.timedelta(seconds=config.tasks.question_solve.retry_config.initial_interval),
                    maximum_interval=workflow.timedelta(seconds=config.tasks.question_solve.retry_config.maximum_interval),
                    maximum_attempts=config.tasks.question_solve.retry_config.maximum_attempts,
                )
            )
            workflow.logger.debug(f"[QuestionSolveWorkflow] question_solve result: {result}")
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_SOLVE,
                status=TASK_STATUS.SUCCESS,
                progress=100,
                message="Task completed",
                result=result.model_dump_json(),
                is_internal=params.is_internal
            )
            return QuestionSolveWorkflowResult(**result.model_dump())
        except (Exception, asyncio.CancelledError) as e:
            is_cancelled = isinstance(e, asyncio.CancelledError)
            target_status = TASK_STATUS.REVOKED if is_cancelled else TASK_STATUS.FAILURE
            err_msg = "Task was canceled" if is_cancelled else f"Task failed: {self._get_exception_message(e)}"
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_SOLVE,
                status=target_status,
                progress=0,
                message=err_msg,
                is_internal=params.is_internal
            )
            raise e
