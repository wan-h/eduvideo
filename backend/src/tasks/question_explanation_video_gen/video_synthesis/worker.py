import asyncio
from temporalio.worker import Worker
from src.middleware.temporalio.client import get_temporal_client
from src.tasks.question_explanation_video_gen.video_synthesis.activities import video_synthesis
from src.tasks.question_explanation_video_gen.video_synthesis.workflows import VideoSynthesisWorkflow, VideoScriptSynthesisWorkflow
from src.utils import config, logger


async def main():
    # Connect to Temporal server
    client = await get_temporal_client()
    
    logger.info(f"Starting VideoSynthesisWorkflow worker...")
    
    worker = Worker(
        client,
        task_queue=config.tasks.question_explanation_video_gen_synthesis.task_queue,
        workflows=[
            VideoSynthesisWorkflow,
            VideoScriptSynthesisWorkflow
        ],
        activities=[
            video_synthesis,
        ],
        # 限制并发活动数以防止 CPU/内存过载
        max_concurrent_activities=config.tasks.question_explanation_video_gen_synthesis.concurrency,
        max_task_queue_activities_per_second=config.tasks.question_explanation_video_gen_synthesis.max_task_queue_activities_per_second if config.tasks.question_explanation_video_gen_synthesis.max_task_queue_activities_per_second > 0 else None,
        # 禁用工作流缓存以节省内存
        # max_cached_workflows=0,
    )
    
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
