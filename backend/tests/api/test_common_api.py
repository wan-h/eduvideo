# -*- coding: utf-8 -*-
"""
API endpoint tests for common eduvideo endpoints (common_v0.py).
"""


def test_get_share_videos(client, auth_headers):
    """Test GET share_videos endpoint."""
    response = client.get("/api/education-ai/eduvideo/v0/common/share_videos", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert "data" in data


def test_get_home_display_info(client, auth_headers):
    """Test GET home_display_info endpoint."""
    response = client.get("/api/education-ai/eduvideo/v0/common/home_display_info", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 200
    assert "notifications" in data["data"]


def test_get_multilingual_common_endpoints(client, auth_headers):
    """Test Accept-Language header for common endpoints."""
    en_headers = {**auth_headers, "Accept-Language": "en"}

    # share_videos with English header
    resp = client.get("/api/education-ai/eduvideo/v0/common/share_videos", headers=en_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == 200
    if len(data["data"]) > 0:
        assert data["data"][0]["title"] == "Math Olympiad Explanation"

    # home_display_info with English header
    resp = client.get("/api/education-ai/eduvideo/v0/common/home_display_info", headers=en_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == 200
    assert "Official version is live" in data["data"]["notifications"][0]
