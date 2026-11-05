# -*- coding: utf-8 -*-
"""
API endpoint tests for video synthesis endpoints (synthesis_v0.py).
"""

from typing import get_args
from unittest.mock import AsyncMock, MagicMock, patch

from src.schema import TASK_STATUS
from src.server.api.task.schema import TaskSubmitResp
from src.server.dal.eduvideo import VideoSynthesisRecordDAL, VideoSynthesisTemplateDAL
from src.server.dal.task import QuestionExplanationVideoGenScriptTaskDAL

RealVideoSynthesisRecordDAL = get_args(VideoSynthesisRecordDAL)[0]
RealVideoSynthesisTemplateDAL = get_args(VideoSynthesisTemplateDAL)[0]
RealQuestionExplanationVideoGenScriptTaskDAL = get_args(QuestionExplanationVideoGenScriptTaskDAL)[0]


def test_list_templates(client, auth_headers):
    """Test GET templates endpoint."""
    with patch.object(RealVideoSynthesisTemplateDAL, "query_by_user_id", new_callable=AsyncMock) as mock_query:
        mock_query.return_value = []

        response = client.get(
            "/api/education-ai/eduvideo/v0/synthesis/template",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0


def test_trigger_video_synthesis(client, auth_headers):
    """Test POST video synthesis trigger endpoint."""
    with (
        patch("src.server.api.eduvideo.synthesis_v0.submit_task", new_callable=AsyncMock) as mock_submit,
        patch.object(RealVideoSynthesisRecordDAL, "create", new_callable=AsyncMock),
        patch.object(RealVideoSynthesisRecordDAL, "query_active_by_md5", new_callable=AsyncMock) as mock_active,
        patch.object(
            RealQuestionExplanationVideoGenScriptTaskDAL, "query_by_id", new_callable=AsyncMock
        ) as mock_script_query,
    ):
        mock_active.return_value = None

        mock_script = MagicMock()
        mock_script.status = TASK_STATUS.SUCCESS  # 10
        mock_script.result = "{}"
        mock_script_query.return_value = mock_script

        mock_submit.return_value = TaskSubmitResp(data="synth_task_123")

        response = client.post(
            "/api/education-ai/eduvideo/v0/synthesis",
            json={
                "script_id": "script_123",
                "export_settings": {
                    "resolution": "1080p",
                    "fps": 30,
                    "background": "default",
                    "opening_film": "",
                    "closing_film": "",
                    "watermark": "",
                    "speed": 1.0,
                },
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert data["data"] == "synth_task_123"
