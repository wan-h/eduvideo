# -*- coding: utf-8 -*-
"""
@File    : worker.py
@Author  : 一力辉
"""

import asyncio
from temporalio.worker import Worker
from src.middleware.temporalio.client import get_temporal_client
from src.tasks.doc_parse.activities import doc_structure_parse
from src.tasks.doc_parse.workflows import DocParseWorkflow
from src.utils import config, logger


async def main():
    # Connect to Temporal server
    client = await get_temporal_client()
    
    logger.info("Starting DocParseWorkflow worker...")
    
    # Create worker with IO-optimized settings
    # High concurrency is OK since activities are IO-bound (waiting for API responses)
    worker = Worker(
        client,
        task_queue=config.tasks.doc_parse.task_queue,
        workflows=[
            DocParseWorkflow
        ],
        activities=[
            doc_structure_parse,
        ],
        # High concurrency for IO-intensive tasks
        max_concurrent_activities=config.tasks.doc_parse.concurrency,
        max_task_queue_activities_per_second=config.tasks.doc_parse.max_task_queue_activities_per_second if config.tasks.doc_parse.max_task_queue_activities_per_second > 0 else None,
    )
    
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
