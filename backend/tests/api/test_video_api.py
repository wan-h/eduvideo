# -*- coding: utf-8 -*-
"""
API endpoint tests for video generation endpoints (video_v0.py).
"""

from datetime import datetime
from typing import get_args
from unittest.mock import AsyncMock, MagicMock, patch

from src.schema import TASK_STATUS
from src.server.api.task.schema import TaskInfoResp, TaskSubmitResp
from src.server.dal.eduvideo import VideoSynthesisRecordDAL, WorkspaceDAL
from src.server.dal.task import (
    QuestionExplanationVideoGenScriptTaskDAL,
    QuestionExplanationVideoGenSynthesisTaskDAL,
)

RealWorkspaceDAL = get_args(WorkspaceDAL)[0]
RealRecordDAL = get_args(VideoSynthesisRecordDAL)[0]
RealScriptTaskDAL = get_args(QuestionExplanationVideoGenScriptTaskDAL)[0]
RealSynthesisTaskDAL = get_args(QuestionExplanationVideoGenSynthesisTaskDAL)[0]


def test_submit_openai_video(client, auth_headers):
    """Test POST video generations endpoint."""
    with (
        patch("src.server.api.eduvideo.video_v0.submit_task", new_callable=AsyncMock) as mock_submit,
        patch.object(RealScriptTaskDAL, "create", new_callable=AsyncMock) as mock_script_create,
        patch.object(RealSynthesisTaskDAL, "create", new_callable=AsyncMock) as mock_synth_create,
        patch.object(RealWorkspaceDAL, "create_script_relation", new_callable=AsyncMock),
        patch.object(RealRecordDAL, "create", new_callable=AsyncMock),
    ):
        mock_script = MagicMock(id="script_123")
        mock_synth = MagicMock(id="synth_123")
        mock_script_create.return_value = mock_script
        mock_synth_create.return_value = mock_synth
        mock_submit.return_value = TaskSubmitResp(data="task_parent_123")

        response = client.post(
            "/api/education-ai/eduvideo/v0/video/generations",
            json={
                "text": "Solve 1+1",
                "urls": ["http://img.png"],
                "subject": "math",
                "stage": "senior",
                "language": "chinese",
                "voice": "zh_female_putonghua",
                "video_export_desc": {
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
        assert data["data"] == "task_parent_123"


def test_get_openai_video(client, auth_headers):
    """Test GET video generation status endpoint."""
    with patch("src.server.api.eduvideo.video_v0.get_task_status", new_callable=AsyncMock) as mock_status:
        mock_status.return_value = TaskInfoResp(
            data=TaskInfoResp.TaskInfo(
                id="task_123",
                request="{}",
                status=TASK_STATUS.SUCCESS,
                progress=100,
                created_at=datetime.now(),
            )
        )

        response = client.get(
            "/api/education-ai/eduvideo/v0/video/generations/task_123",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
