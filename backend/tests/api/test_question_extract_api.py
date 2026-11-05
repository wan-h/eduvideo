# -*- coding: utf-8 -*-
"""
API endpoint tests for question extraction confirmation endpoints (question_extract_v0.py).
"""

from typing import get_args
from unittest.mock import MagicMock

from src.schema import TASK_STATUS
from src.server.dal.eduvideo import WorkspaceDAL
from src.server.dal.task import QuestionExplanationVideoGenScriptTaskDAL
from src.server.models.eduvideo import ScriptQuestionsExtractConfirm

RealWorkspaceDAL = get_args(WorkspaceDAL)[0]
RealScriptDAL = get_args(QuestionExplanationVideoGenScriptTaskDAL)[0]


def test_create_question_extract_task(client, auth_headers):
    """Test POST question extract task endpoint."""
    response = client.post(
        "/api/education-ai/eduvideo/v0/question_extract",
        json={
            "user_id": "tester",
            "script_task_id": "script_123",
            "urls": ["http://img.png"],
            "extract_result": {"questions": []},
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0


def test_list_pending_confirms(client, auth_headers, mock_db_session):
    """Test GET pending confirms list endpoint."""
    mock_confirm = MagicMock()
    mock_confirm.id = "c_1"
    mock_confirm.script_task_id = "script_1"
    mock_confirm.extract_question_task_id = "extract_1"
    mock_confirm.status = TASK_STATUS.WAIT_CONFIRM
    mock_confirm.created_at = "2026-01-01T00:00:00"

    mock_res = MagicMock()
    mock_res.all.return_value = [(mock_confirm, '{"questions": []}', "folder_1")]
    mock_db_session.execute.return_value = mock_res

    response = client.get("/api/education-ai/eduvideo/v0/question_extract", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert len(data["data"]) == 1


def test_confirm_question_extract_not_found(client, auth_headers):
    """Test PUT confirm endpoint when record is not found."""
    response = client.put(
        "/api/education-ai/eduvideo/v0/question_extract",
        json={"confirm_id": "c_nonexistent", "questions": [], "folder_id": ""},
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_delete_question_extract_confirm_success(client, auth_headers, mock_db_session):
    """Test DELETE confirm record endpoint."""
    mock_confirm = ScriptQuestionsExtractConfirm(
        id="c_123",
        user_id="tester",
        extract_question_task_id="ext_1",
        script_task_id="script_1",
    )
    mock_db_session.get.return_value = mock_confirm

    response = client.request(
        "DELETE",
        "/api/education-ai/eduvideo/v0/question_extract",
        json={"confirm_id": "c_123"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
