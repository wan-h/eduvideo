# -*- coding: utf-8 -*-
"""
API endpoint tests for file storage endpoints.
"""

from unittest.mock import AsyncMock, patch

from src.server.dal.storage import StorageDAL


def test_get_upload_presigned_url(client, auth_headers):
    """Test GET upload presigned URL endpoint."""
    with (
        patch.object(StorageDAL, "generate_upload_presigned_url", new_callable=AsyncMock) as mock_upload,
        patch.object(StorageDAL, "get_path") as mock_path,
    ):
        mock_upload.return_value = "https://oss.example.com/upload"
        mock_path.return_value = "https://oss.example.com/public/test.png"

        response = client.get(
            "/api/education-ai/storage/v0/upload/presigned_url", params={"file_name": "test.png"}, headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert "data" in data
