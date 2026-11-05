# -*- coding: utf-8 -*-
"""
Unit tests for base background activities (update_task_status).
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from src.schema import TASK_STATUS, TASK_TYPE, RequestInfo
from src.tasks.base.activities import update_task_status
from src.tasks.base.schema import TaskStatusUpdateParams


def test_update_task_status_activity():
    async def _impl():
        with patch("httpx.AsyncClient.put", new_callable=AsyncMock) as mock_put:
            mock_resp = MagicMock()
            mock_resp.raise_for_status = MagicMock()
            mock_resp.json.return_value = {"code": 0, "message": "ok"}
            mock_put.return_value = mock_resp

            params = TaskStatusUpdateParams(
                resquest_info=RequestInfo(request_id="req1", user_id="u1", organization_id="org1"),
                task_id="t1",
                task_type=TASK_TYPE.DOC_PARSE,
                status=TASK_STATUS.SUCCESS,
                progress=100,
                result="{}",
                message="done",
            )
            await update_task_status(params)
            mock_put.assert_awaited_once()

    asyncio.run(_impl())
