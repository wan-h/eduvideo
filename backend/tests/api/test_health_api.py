# -*- coding: utf-8 -*-
"""
API endpoint tests for /health and common eduvideo endpoints.
"""


def test_health_check(client):
    """Test /health endpoint returns 200 and BaseResponse structure."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert data["message"] == "success"


def test_share_videos_endpoint(client, auth_headers):
    """Test /share_videos endpoint."""
    response = client.get("/api/education-ai/eduvideo/v0/common/share_videos", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert "data" in data


def test_home_display_info_endpoint(client, auth_headers):
    """Test /home_display_info endpoint."""
    response = client.get("/api/education-ai/eduvideo/v0/common/home_display_info", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert "data" in data
