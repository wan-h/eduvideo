# -*- coding: utf-8 -*-
"""
Unit tests for TaskDAL layer.
"""

import asyncio
from typing import get_args
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.schema import TASK_STATUS, TASK_TYPE
from src.server.dal.task import DocParseTaskDAL, get_task_dal
from src.server.models.task import DocParseTask

RealDocParseTaskDAL = get_args(DocParseTaskDAL)[0]


def test_task_dal_create():
    async def _impl():
        mock_session = AsyncMock()
        dal = RealDocParseTaskDAL(mock_session)

        task = await dal.create(
            user_id="user_1",
            workflow_id="wf_1",
            request="{}",
            progress=10,
            result="res",
            message="msg",
            status=TASK_STATUS.STARTED,
        )

        mock_session.add.assert_called_once()
        mock_session.flush.assert_awaited_once()
        assert task.user_id == "user_1"
        assert task.workflow_id == "wf_1"

    asyncio.run(_impl())


def test_task_dal_query_by_id():
    async def _impl():
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_task = DocParseTask(id="task_1", user_id="user_1")
        mock_result.scalar.return_value = mock_task
        mock_session.execute.return_value = mock_result

        dal = RealDocParseTaskDAL(mock_session)
        task = await dal.query_by_id("task_1", "user_1")

        assert task == mock_task
        mock_session.execute.assert_awaited_once()

    asyncio.run(_impl())


def test_task_dal_query_by_user_id():
    async def _impl():
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_tasks = [DocParseTask(id="t1"), DocParseTask(id="t2")]
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = mock_tasks
        mock_result.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_result

        dal = RealDocParseTaskDAL(mock_session)
        tasks = await dal.query_by_user_id("user_1", limit=10, offset=0)

        assert tasks == mock_tasks

    asyncio.run(_impl())


def test_task_dal_update_by_id():
    async def _impl():
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_task = DocParseTask(id="t1", progress=100)
        mock_result.scalar.return_value = mock_task
        mock_session.execute.return_value = mock_result

        dal = RealDocParseTaskDAL(mock_session)
        updated = await dal.update_by_id("t1", "user_1", progress=100, status=TASK_STATUS.SUCCESS)

        assert updated == mock_task
        mock_session.flush.assert_awaited_once()

    asyncio.run(_impl())


def test_task_dal_update_by_id_empty_values():
    async def _impl():
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_task = DocParseTask(id="t1")
        mock_result.scalar.return_value = mock_task
        mock_session.execute.return_value = mock_result

        dal = RealDocParseTaskDAL(mock_session)
        res = await dal.update_by_id("t1", "user_1")
        assert res == mock_task

    asyncio.run(_impl())


def test_task_dal_delete_by_id():
    async def _impl():
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_task = DocParseTask(id="t1", activate=False)
        mock_result.scalar.return_value = mock_task
        mock_session.execute.return_value = mock_result

        dal = RealDocParseTaskDAL(mock_session)
        deleted = await dal.delete_by_id("t1", "user_1")

        assert deleted == mock_task

    asyncio.run(_impl())


def test_task_dal_count_by_user_id():
    async def _impl():
        mock_session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar.return_value = 5
        mock_session.execute.return_value = mock_result

        dal = RealDocParseTaskDAL(mock_session)
        count = await dal.count_by_user_id("user_1")

        assert count == 5

    asyncio.run(_impl())


def test_get_task_dal():
    mock_session = AsyncMock()
    dal = get_task_dal(TASK_TYPE.DOC_PARSE, mock_session)
    assert dal.__class__.__name__ == "DocParseTaskDAL"

    with pytest.raises(ValueError, match="Unsupported task type"):
        get_task_dal("invalid_type", mock_session)
