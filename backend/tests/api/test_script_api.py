# -*- coding: utf-8 -*-
"""
API endpoint tests for script task generation endpoints (script_v0.py).
"""

from datetime import datetime
from typing import get_args
from unittest.mock import AsyncMock, MagicMock, patch

from src.schema import TASK_STATUS
from src.server.api.task.schema import TaskSubmitResp
from src.server.dal.eduvideo import WorkspaceDAL
from src.server.dal.task import QuestionExplanationVideoGenScriptTaskDAL
from src.server.schema.request import BaseResponse

RealWorkspaceDAL = get_args(WorkspaceDAL)[0]
RealScriptDAL = get_args(QuestionExplanationVideoGenScriptTaskDAL)[0]


def test_submit_script_task_success(client, auth_headers):
    """Test POST submit script task endpoint (success)."""
    with (
        patch("src.server.api.eduvideo.script_v0.submit_task", new_callable=AsyncMock) as mock_submit,
        patch.object(RealWorkspaceDAL, "create_script_relation", new_callable=AsyncMock),
    ):
        mock_submit.return_value = TaskSubmitResp(data="script_task_123")

        response = client.post(
            "/api/education-ai/eduvideo/v0/script",
            json={
                "text": "Explain calculus derivative",
                "urls": [],
                "voice": "zh_female_putonghua",
                "stage": "senior",
                "language": "chinese",
                "folder_id": "",
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["data"] == "script_task_123"


def test_submit_script_task_invalid_input(client, auth_headers):
    """Test POST submit script task with missing text and urls."""
    response = client.post(
        "/api/education-ai/eduvideo/v0/script",
        json={
            "text": "",
            "urls": [],
            "voice": "zh_female_putonghua",
            "stage": "senior",
            "language": "chinese",
        },
        headers=auth_headers,
    )
    assert response.status_code == 403


def test_submit_script_task_folder_not_found(client, auth_headers):
    """Test POST submit script task with invalid folder_id."""
    with patch.object(RealWorkspaceDAL, "query_folder_by_id", new_callable=AsyncMock) as mock_folder:
        mock_folder.return_value = None

        response = client.post(
            "/api/education-ai/eduvideo/v0/script",
            json={
                "text": "Explain physics formula",
                "urls": [],
                "voice": "zh_female_putonghua",
                "stage": "senior",
                "language": "chinese",
                "folder_id": "invalid_folder",
            },
            headers=auth_headers,
        )

        assert response.status_code == 404


def test_get_script_task_info(client, auth_headers, mock_db_session):
    """Test GET script task detail endpoint (found)."""
    mock_task = MagicMock()
    mock_task.id = "task_123"
    mock_task.status = TASK_STATUS.PENDING
    mock_task.progress = 0
    mock_task.request = "{}"
    mock_task.result = "{}"
    mock_task.message = ""
    mock_task.created_at = datetime.now()

    mock_result = MagicMock()
    mock_result.scalar.return_value = mock_task
    mock_db_session.execute = AsyncMock(return_value=mock_result)

    response = client.get("/api/education-ai/eduvideo/v0/script/task_123", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0


def test_get_script_task_info_not_found(client, auth_headers, mock_db_session):
    """Test GET script task detail endpoint (not found)."""
    mock_result = MagicMock()
    mock_result.scalar.return_value = None
    mock_db_session.execute = AsyncMock(return_value=mock_result)

    response = client.get("/api/education-ai/eduvideo/v0/script/nonexistent_123", headers=auth_headers)

    assert response.status_code == 404


def test_get_script_task_list(client, auth_headers):
    """Test GET script task list endpoint."""
    with (
        patch.object(RealScriptDAL, "query_by_user_id", new_callable=AsyncMock) as mock_query,
        patch.object(RealScriptDAL, "count_by_user_id", new_callable=AsyncMock) as mock_count,
    ):
        mock_task = MagicMock()
        mock_task.id = "script_123"
        mock_task.status = TASK_STATUS.SUCCESS
        mock_task.progress = 100
        mock_task.result = '{"question_metadata": {"title": "Math Problem"}}'
        mock_task.message = "Done"
        mock_task.created_at = datetime.now()
        mock_task.request = (
            '{"text": "Calculate 2+2", "urls": [], "voice": "xiaoxiao", "stage": "senior", "language": "chinese"}'
        )

        mock_query.return_value = [mock_task]
        mock_count.return_value = 1

        response = client.get("/api/education-ai/eduvideo/v0/script", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["data"]["total"] == 1


def test_delete_script_task(client, auth_headers):
    """Test DELETE script task endpoint."""
    with patch("src.server.api.eduvideo.script_v0.api_delete_task", new_callable=AsyncMock) as mock_del:
        mock_del.return_value = BaseResponse()

        response = client.delete("/api/education-ai/eduvideo/v0/script/task_123", headers=auth_headers)

        assert response.status_code == 200
