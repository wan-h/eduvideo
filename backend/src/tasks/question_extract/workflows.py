# -*- coding: utf-8 -*-
"""
@File    : workflows.py
@Author  : 一力辉
"""

import json
from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    import pydantic_core
    import asyncio
    from src.utils import config, logger
    from src.schema import TASK_TYPE, TASK_STATUS, RequestInfo
    from src.tasks.doc_parse.schema import DocParseWorkflowParams, DocParseWorkflowResult
    from src.tasks.doc_parse.workflows import DocParseWorkflow
    from src.tasks.question_extract.schema import (
        QuestionExtractFromDocParams,
        QuestionExtractFromDocResult,
        QuestionExtractWorkflowParams,
        QuestionExtractWorkflowResult,
    )
    from src.tasks.question_extract.activities import question_extract_from_doc
    from src.tasks.base.workflows import BaseWorkflow


@workflow.defn
class QuestionExtractWorkflow(BaseWorkflow):
    @workflow.run
    async def run(self, params: QuestionExtractWorkflowParams) -> QuestionExtractWorkflowResult:
        await self._update_task_status(
            request_info=params.resquest_info,
            task_id=params.task_id,
            task_type=TASK_TYPE.QUESTION_EXTRACT,
            status=TASK_STATUS.PENDING,
            message="正在排队等待题目切分节点...",
            progress=0,
            is_internal=params.is_internal,
        )

        if not params.urls:
            result = QuestionExtractFromDocResult(questions=[], total=0)
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_EXTRACT,
                status=TASK_STATUS.SUCCESS,
                progress=100,
                message="Task completed (empty input urls)",
                result=result.model_dump_json(),
                is_internal=params.is_internal,
            )
            return QuestionExtractWorkflowResult(**result.model_dump())

        try:
            # Step 1: 解析文档
            doc_parse_results = await self._run_doc_parse(params)

            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_EXTRACT,
                status=TASK_STATUS.STARTED,
                message="Document parsed, extracting questions...",
                progress=50,
                is_internal=params.is_internal,
            )

            # Step 2: 提取题目
            result = await self._run_question_extract(doc_parse_results, params)
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_EXTRACT,
                status=TASK_STATUS.SUCCESS,
                progress=100,
                message="Task completed",
                result=result.model_dump_json(),
                is_internal=params.is_internal,
            )
            return QuestionExtractWorkflowResult(**result.model_dump())

        except (Exception, asyncio.CancelledError) as e:
            is_cancelled = isinstance(e, asyncio.CancelledError)
            target_status = TASK_STATUS.REVOKED if is_cancelled else TASK_STATUS.FAILURE
            err_msg = "Task was canceled" if is_cancelled else f"Task failed: {self._get_exception_message(e)}"
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_EXTRACT,
                status=target_status,
                progress=0,
                message=err_msg,
                is_internal=params.is_internal,
            )
            raise e

    async def _run_doc_parse(self, params: QuestionExtractWorkflowParams) -> list[DocParseWorkflowResult]:
        urls = params.urls
        tasks = []
        for i, url in enumerate(urls):
            task = workflow.execute_child_workflow(
                DocParseWorkflow,
                DocParseWorkflowParams(
                    resquest_info=params.resquest_info,
                    task_id=params.task_id,
                    url=url,
                    is_internal=True,   # 内部调用，不单独更新任务状态
                ),
                id=f"{workflow.info().workflow_id}_{TASK_TYPE.DOC_PARSE}_{workflow.uuid4()}",
                task_queue=config.tasks.doc_parse.task_queue,
            )
            tasks.append(task)
            
        results = await asyncio.gather(*tasks)
        workflow.logger.debug(f"[QuestionExtractWorkflow] {len(results)} doc_parse done")
        return list(results)

    async def _run_question_extract(self, doc_parse_results: list[DocParseWorkflowResult], params: QuestionExtractWorkflowParams) -> QuestionExtractFromDocResult:
        urls = params.urls
        result = await workflow.execute_activity(
            question_extract_from_doc,
            QuestionExtractFromDocParams(
                resquest_info=params.resquest_info,
                task_id=params.task_id,
                source_urls=urls,
                doc_parse_results=doc_parse_results
            ),
            start_to_close_timeout=workflow.timedelta(minutes=config.tasks.question_extract.start_to_close_timeout),
            retry_policy=RetryPolicy(
                initial_interval=workflow.timedelta(seconds=config.tasks.question_extract.retry_config.initial_interval),
                maximum_interval=workflow.timedelta(seconds=config.tasks.question_extract.retry_config.maximum_interval),
                maximum_attempts=config.tasks.question_extract.retry_config.maximum_attempts,
            ),
        )
        return result
