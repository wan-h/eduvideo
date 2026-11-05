# -*- coding: utf-8 -*-
"""
API endpoint tests for TTS synthesis endpoints (tts_v0.py).
"""

from typing import get_args
from unittest.mock import AsyncMock, patch

from src.server.api.task.schema import TaskSubmitResp
from src.server.dal.eduvideo import EdtTtsRecordDAL

RealEdtTtsRecordDAL = get_args(EdtTtsRecordDAL)[0]


def test_get_edit_tips(client, auth_headers):
    """Test GET edit tips endpoint."""
    response = client.get("/api/education-ai/eduvideo/v0/ttsedit/tips", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert len(data["data"]) > 0


def test_get_voice_list(client, auth_headers):
    """Test GET supported voices endpoint."""
    response = client.get("/api/education-ai/eduvideo/v0/tts/voices", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0


def test_get_multilingual_tts_endpoints(client, auth_headers):
    """Test Accept-Language header for TTS endpoints."""
    en_headers = {**auth_headers, "Accept-Language": "en"}

    # edit/tips with English header
    response = client.get("/api/education-ai/eduvideo/v0/ttsedit/tips", headers=en_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "Chinese pronunciation can be precisely controlled" in data["data"][0]

    # voices with English header
    response = client.get("/api/education-ai/eduvideo/v0/tts/voices", headers=en_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    labels = [v["label"] for v in data["data"]]
    assert "Mandarin Female" in labels


def test_trigger_tts(client, auth_headers):
    """Test POST TTS trigger endpoint."""
    with (
        patch("src.server.api.eduvideo.tts_v0.submit_task", new_callable=AsyncMock) as mock_submit,
        patch.object(RealEdtTtsRecordDAL, "create", new_callable=AsyncMock),
    ):
        mock_submit.return_value = TaskSubmitResp(data="tts_task_123")

        response = client.post(
            "/api/education-ai/eduvideo/v0/tts",
            json={
                "script_id": "script_123",
                "text": "Hello world",
                "voice": "zh_female_putonghua",
                "subject": "math",
                "language": "chinese",
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["data"] == "tts_task_123"
