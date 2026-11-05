# -*- coding: utf-8 -*-
"""
@File    : activities.py
@Author  : 一力辉
"""


import httpx
from temporalio import activity
from .schema import TaskStatusUpdateParams
from src.utils import config

@activity.defn
async def update_task_status(
    params: TaskStatusUpdateParams
) -> None:
    """
    更新任务状态
    """
    url = f"{config.tasks.server_url}/api/{config.common.name}/task/v0/{params.task_type}/{params.task_id}"
    headers = {
        "user-id": params.resquest_info.user_id,
        "organization-id": params.resquest_info.organization_id
    }
    payload = {
        "status": params.status,
        "progress": params.progress,
        "result": params.result,
        "message": params.message,
    }
    async with httpx.AsyncClient(verify=False, timeout=None) as client:
        response = await client.put(url, json=payload, headers=headers)
        response.raise_for_status()
        code = response.json()["code"]
        if code != 0:
            raise Exception(response.json()["message"])