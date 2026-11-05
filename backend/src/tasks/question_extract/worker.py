# -*- coding: utf-8 -*-
"""
@File    : worker.py
@Author  : 一力辉
"""

import asyncio
from temporalio.worker import Worker
from src.middleware.temporalio.client import get_temporal_client
from src.tasks.question_extract.activities import question_extract_from_doc
from src.tasks.question_extract.workflows import QuestionExtractWorkflow
from src.utils import config, logger


async def main():
    client = await get_temporal_client()

    logger.info("Starting QuestionExtractWorkflow worker...")

    worker = Worker(
        client,
        task_queue=config.tasks.question_extract.task_queue,
        workflows=[
            QuestionExtractWorkflow,
        ],
        activities=[
            question_extract_from_doc
        ],
        max_concurrent_activities=config.tasks.question_extract.concurrency,
        max_task_queue_activities_per_second=config.tasks.question_extract.max_task_queue_activities_per_second if config.tasks.question_extract.max_task_queue_activities_per_second > 0 else None,
    )

    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
