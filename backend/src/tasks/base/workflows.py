# -*- coding: utf-8 -*-
"""
@File    : workflows.py
@Author  : 一力辉
"""

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    import pydantic_core
    from src.utils import config
    from src.schema import TASK_TYPE, TASK_STATUS, RequestInfo
    from src.tasks.base.schema import TaskStatusUpdateParams
    from src.tasks.base.activities import update_task_status


class BaseWorkflow:
    async def _update_task_status(
        self,
        request_info: RequestInfo,
        task_id: str,
        task_type: TASK_TYPE,
        status: TASK_STATUS | None = None,
        result: str | None = None,
        message: str | None = None,
        progress: int | None = None,
        is_internal: bool = False
    ) -> None:
        if is_internal: return
        """统一更新任务状态的辅助方法"""
        await workflow.execute_activity(
            update_task_status,
            TaskStatusUpdateParams(
                resquest_info=request_info,
                task_id=task_id,
                task_type=task_type,
                status=status,
                result=result,
                message=message,
                progress=progress,
            ),
            start_to_close_timeout=workflow.timedelta(minutes=config.tasks.base_task.start_to_close_timeout),
            task_queue=config.tasks.base_task.task_queue,
            retry_policy=RetryPolicy(
                initial_interval=workflow.timedelta(seconds=config.tasks.base_task.retry_config.initial_interval),
                maximum_interval=workflow.timedelta(seconds=config.tasks.base_task.retry_config.maximum_interval),
                maximum_attempts=config.tasks.base_task.retry_config.maximum_attempts,
            )
        )

    def _get_exception_message(self, e: Exception) -> str:
        """从异常链中提取最底层的 user-friendly 错误信息"""
        curr = e
        while getattr(curr, "__cause__", None) is not None:
            curr = curr.__cause__
        
        if hasattr(curr, "message") and getattr(curr, "message", None):
            return curr.message
            
        return str(curr)