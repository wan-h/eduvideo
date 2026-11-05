# -*- coding: utf-8 -*-
"""
@File    : worker.py
@Author  : 一力辉
"""

import asyncio
from temporalio.worker import Worker
from src.middleware.temporalio.client import get_temporal_client
from src.tasks.question_explanation_video_gen.script_gen.activities import generate_script, create_questions_extract_task, gen_video_script_image_upload_replace
from src.tasks.question_explanation_video_gen.script_gen.workflows import ScriptGenWorkflow
from src.utils import config, logger


async def main():
    # Connect to Temporal server
    client = await get_temporal_client()
    
    logger.info("Starting ScriptGenWorkflow worker...")
    
    # Create worker with IO-optimized settings
    # High concurrency is OK since activities are IO-bound (waiting for API responses)
    worker = Worker(
        client,
        task_queue=config.tasks.question_explanation_video_gen_script.task_queue,
        workflows=[
            ScriptGenWorkflow
        ],
        activities=[
            generate_script,
            create_questions_extract_task,
            gen_video_script_image_upload_replace
        ],
        # High concurrency for IO-intensive tasks
        max_concurrent_activities=config.tasks.question_explanation_video_gen_script.concurrency,
        max_task_queue_activities_per_second=config.tasks.question_explanation_video_gen_script.max_task_queue_activities_per_second if config.tasks.question_explanation_video_gen_script.max_task_queue_activities_per_second > 0 else None,
    )
    
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
