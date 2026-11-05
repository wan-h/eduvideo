# -*- coding: utf-8 -*-
"""
API endpoint tests for AI assist endpoint (ai_assist_v0.py).
"""

from unittest.mock import patch


def test_ai_edit_api_mock(client, auth_headers):
    """Test POST /api/education-ai/eduvideo/v0/ai_assist/edit endpoint."""
    payload = {
        "field_type": "step_breakdown",
        "mode": "format_fix",
        "current_content": "推导步骤: $f(x) = x^2",
        "context": {
            "question_stem": "已知二次函数 $f(x) = x^2$",
            "options": ["A. 1", "B. 2"],
            "steps": [
                {
                    "title": "步骤1",
                    "breakdown": "推导步骤: $f(x) = x^2$",
                    "summary": "得解",
                }
            ],
            "active_step_index": 0,
        },
    }

    async def mock_stream(req):
        yield {"type": "delta", "content": "推导步骤: $f(x) = x^2$"}
        yield {
            "type": "done",
            "suggested_content": "推导步骤: $f(x) = x^2$",
            "change_summary": "已自动闭合美元符号",
            "syntax_valid": True,
            "prompt_tokens": 100,
            "completion_tokens": 50,
        }

    with patch(
        "src.server.services.ai_editor_service.AIEditorService.generate_edit_stream",
        side_effect=mock_stream,
    ):
        response = client.post(
            "/api/education-ai/eduvideo/v0/ai_assist/edit",
            json=payload,
            headers=auth_headers,
        )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")
    assert "data:" in response.text
    assert "推导步骤: $f(x) = x^2$" in response.text


def test_ai_edit_image_api_mock(client, auth_headers):
    """Test POST /api/education-ai/eduvideo/v0/ai_assist/edit_image endpoint."""
    payload = {
        "script_task_id": "test_task_123",
        "image_url": "https://example.com/test.png",
        "prompt": "擦除水印",
    }

    async def mock_edit_image(self, user_id, task_id, image_url, prompt):
        return "https://example.com/test_edited.png"

    with patch(
        "src.server.services.ai_editor_service.AIEditorService.edit_image",
        new=mock_edit_image,
    ):
        response = client.post(
            "/api/education-ai/eduvideo/v0/ai_assist/edit_image",
            json=payload,
            headers=auth_headers,
        )

    assert response.status_code == 200
    res_data = response.json()
    assert res_data["code"] == 0
    assert res_data["data"]["new_image_url"] == "https://example.com/test_edited.png"
