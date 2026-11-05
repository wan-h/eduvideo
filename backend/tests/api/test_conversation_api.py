# -*- coding: utf-8 -*-
"""
API endpoint tests for chat session and conversation endpoints (conversation_v0.py).
"""

from typing import get_args
from unittest.mock import AsyncMock, MagicMock, patch

from src.server.dal.eduvideo import ChatMessageDAL, ChatSessionDAL

RealChatSessionDAL = get_args(ChatSessionDAL)[0]
RealChatMessageDAL = get_args(ChatMessageDAL)[0]


def test_get_sessions(client, auth_headers):
    """Test GET chat sessions endpoint."""
    with (
        patch.object(RealChatSessionDAL, "query_by_script", new_callable=AsyncMock) as mock_get,
        patch.object(RealChatSessionDAL, "count_by_script", new_callable=AsyncMock) as mock_count,
    ):
        mock_session = MagicMock()
        mock_session.id = "s_1"
        mock_session.title = "Session 1"
        mock_session.created_at = "2026-01-01T00:00:00"
        mock_session.updated_at = "2026-01-01T00:00:00"
        mock_get.return_value = [mock_session]
        mock_count.return_value = 1

        response = client.get(
            "/api/education-ai/eduvideo/v0/conversation/sessions",
            params={"script_task_id": "script_123", "limit": 20, "offset": 0},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["data"]["total"] == 1


def test_get_session_messages_success(client, auth_headers):
    """Test GET session messages endpoint (found)."""
    with (
        patch.object(RealChatSessionDAL, "query_by_id", new_callable=AsyncMock) as mock_sess,
        patch.object(RealChatMessageDAL, "query_by_session", new_callable=AsyncMock) as mock_get,
        patch.object(RealChatMessageDAL, "count_by_session", new_callable=AsyncMock) as mock_count,
    ):
        mock_sess.return_value = MagicMock(id="session_123")
        mock_msg = MagicMock()
        mock_msg.id = "m_1"
        mock_msg.role = "user"
        mock_msg.content = "hello"
        mock_msg.created_at = "2026-01-01T00:00:00"
        mock_get.return_value = [mock_msg]
        mock_count.return_value = 1

        response = client.get(
            "/api/education-ai/eduvideo/v0/conversation/sessions/session_123/messages",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert len(data["data"]["messages"]) == 1


def test_get_session_messages_not_found(client, auth_headers):
    """Test GET session messages endpoint when session is not found."""
    with patch.object(RealChatSessionDAL, "query_by_id", new_callable=AsyncMock) as mock_sess:
        mock_sess.return_value = None

        response = client.get(
            "/api/education-ai/eduvideo/v0/conversation/sessions/nonexistent/messages",
            headers=auth_headers,
        )

        assert response.status_code == 404


def test_rename_session_success(client, auth_headers):
    """Test PUT session rename endpoint (success)."""
    with patch.object(RealChatSessionDAL, "update_title", new_callable=AsyncMock) as mock_update:
        mock_update.return_value = True

        response = client.put(
            "/api/education-ai/eduvideo/v0/conversation/sessions/session_123",
            json={"title": "New Session Title"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0


def test_rename_session_not_found(client, auth_headers):
    """Test PUT session rename endpoint (session not found)."""
    with patch.object(RealChatSessionDAL, "update_title", new_callable=AsyncMock) as mock_update:
        mock_update.return_value = False

        response = client.put(
            "/api/education-ai/eduvideo/v0/conversation/sessions/nonexistent",
            json={"title": "New Session Title"},
            headers=auth_headers,
        )

        assert response.status_code == 404


def test_delete_session_success(client, auth_headers):
    """Test DELETE session endpoint (success)."""
    with patch.object(RealChatSessionDAL, "delete", new_callable=AsyncMock) as mock_delete:
        mock_delete.return_value = True

        response = client.delete(
            "/api/education-ai/eduvideo/v0/conversation/sessions/session_123",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0


def test_delete_session_not_found(client, auth_headers):
    """Test DELETE session endpoint (not found)."""
    with patch.object(RealChatSessionDAL, "delete", new_callable=AsyncMock) as mock_delete:
        mock_delete.return_value = False

        response = client.delete(
            "/api/education-ai/eduvideo/v0/conversation/sessions/nonexistent",
            headers=auth_headers,
        )

        assert response.status_code == 404


def test_chat_stream_new_session_success(client, auth_headers, mock_db_session):
    """Test POST /chat stream endpoint creating a new session with thinking and completion chunks."""
    valid_script_json = """{
        "question_metadata": {
            "title": "Math Problem",
            "type": "choice_question",
            "level": "normal",
            "subject": "math",
            "stage": "senior",
            "language": "chinese",
            "voice": "xiaoxiao",
            "knowledge_points": ["addition"]
        },
        "question_content": {"stem": "Compute 1+1", "options": []},
        "scenes": {
            "question_introduction": {"stem": "Compute 1+1", "options": [], "subtitles": []},
            "question_solution": {"segments": []},
            "question_key_points": {"segments": []}
        }
    }"""

    mock_task = MagicMock()
    mock_task.result = valid_script_json
    mock_db_res = MagicMock()
    mock_db_res.scalar_one_or_none.return_value = mock_task
    mock_db_session.execute.return_value = mock_db_res

    with (
        patch("src.server.api.eduvideo.conversation_v0.AsyncOpenAI", new_callable=MagicMock) as mock_openai,
        patch.object(RealChatSessionDAL, "create", new_callable=AsyncMock) as mock_sess_create,
        patch.object(RealChatSessionDAL, "touch", new_callable=AsyncMock),
        patch.object(RealChatMessageDAL, "create", new_callable=AsyncMock),
        patch.object(RealChatMessageDAL, "query_recent_for_context", new_callable=AsyncMock) as mock_context,
    ):
        mock_sess_create.return_value = MagicMock(id="new_session_123")
        mock_context.return_value = []

        async def mock_stream():
            # chunk 1: thinking
            chunk1 = MagicMock()
            chunk1.usage = None
            chunk1.choices = [MagicMock()]
            chunk1.choices[0].delta = MagicMock(reasoning_content="Let me think...", content=None)

            # chunk 2: delta content
            chunk2 = MagicMock()
            chunk2.usage = MagicMock(prompt_tokens=100, completion_tokens=50)
            chunk2.choices = [MagicMock()]
            chunk2.choices[0].delta = MagicMock(reasoning_content=None, content="Answer is 2.")

            yield chunk1
            yield chunk2

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())
        mock_openai.return_value = mock_client

        response = client.post(
            "/api/education-ai/eduvideo/v0/conversation/chat",
            json={
                "script_task_id": "script_123",
                "message": "What is 1+1?",
                "current_teacher_handout": "1+1=2",
                "current_teacher_explanation": "Simple math",
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert "session_created" in response.text
        assert "thinking" in response.text
        assert "delta" in response.text
        assert "done" in response.text
