# -*- coding: utf-8 -*-
"""
API endpoint tests for async task status and management (task_v0.py).
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from src.schema import TASK_STATUS


def test_get_task_status_found(client, auth_headers):
    """Test GET task status endpoint (found)."""
    with patch("src.server.api.task.task_v0.get_task_dal") as mock_get_dal:
        mock_dal = AsyncMock()
        mock_task = MagicMock()
        mock_task.id = "task_123"
        mock_task.user_id = "tester"
        mock_task.status = TASK_STATUS.PENDING
        mock_task.progress = 50
        mock_task.request = "{}"
        mock_task.result = "{}"
        mock_task.message = "Running"
        mock_task.created_at = datetime.now()
        mock_task.updated_at = datetime.now()

        mock_dal.query_by_id.return_value = mock_task
        mock_get_dal.return_value = mock_dal

        response = client.get("/api/education-ai/task/v0/readable_tts/task_123", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["data"]["id"] == "task_123"


def test_get_task_status_not_found(client, auth_headers):
    """Test GET task status endpoint when task is not found."""
    with patch("src.server.api.task.task_v0.get_task_dal") as mock_get_dal:
        mock_dal = AsyncMock()
        mock_dal.query_by_id.return_value = None
        mock_get_dal.return_value = mock_dal

        response = client.get("/api/education-ai/task/v0/readable_tts/task_nonexistent", headers=auth_headers)

        assert response.status_code == 404


def test_delete_task_success(client, auth_headers):
    """Test DELETE task endpoint."""
    with patch("src.server.api.task.task_v0.get_task_dal") as mock_get_dal:
        mock_dal = AsyncMock()
        mock_task = MagicMock(id="task_123", user_id="tester", status=TASK_STATUS.SUCCESS)
        mock_dal.query_by_id.return_value = mock_task
        mock_dal.delete_by_id.return_value = mock_task
        mock_get_dal.return_value = mock_dal

        response = client.delete("/api/education-ai/task/v0/readable_tts/task_123", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0


def test_delete_task_not_found(client, auth_headers):
    """Test DELETE task endpoint when task does not exist."""
    with patch("src.server.api.task.task_v0.get_task_dal") as mock_get_dal:
        mock_dal = AsyncMock()
        mock_dal.query_by_id.return_value = None
        mock_dal.delete_by_id.return_value = None
        mock_get_dal.return_value = mock_dal

        response = client.delete("/api/education-ai/task/v0/readable_tts/task_nonexistent", headers=auth_headers)

        assert response.status_code == 404


def test_invalid_task_type(client, auth_headers):
    """Test unsupported task_type parameter."""
    response = client.get("/api/education-ai/task/v0/invalid_task_type/task_123", headers=auth_headers)
    assert response.status_code == 422


def test_update_task_status_endpoint(client, auth_headers):
    """Test PUT task status/result endpoint."""
    with patch("src.server.api.task.task_v0.get_task_dal") as mock_get_dal:
        mock_dal = AsyncMock()
        mock_task = MagicMock(id="task_123")
        mock_dal.update_by_id.return_value = mock_task
        mock_get_dal.return_value = mock_dal

        response = client.put(
            "/api/education-ai/task/v0/readable_tts/task_123",
            json={"status": TASK_STATUS.SUCCESS, "progress": 100, "result": "{}"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
