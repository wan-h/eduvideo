# -*- coding: utf-8 -*-
"""
API endpoint tests for workspace, folder, and storage management.
"""

from datetime import datetime
from typing import get_args
from unittest.mock import AsyncMock, MagicMock, patch

from src.server.dal.eduvideo import WorkspaceDAL
from src.server.dal.storage import StorageDAL

RealWorkspaceDAL = get_args(WorkspaceDAL)[0]


def test_create_folder(client, auth_headers):
    """Test POST folder endpoint."""
    with (
        patch.object(RealWorkspaceDAL, "create_folder", new_callable=AsyncMock) as mock_create,
        patch.object(RealWorkspaceDAL, "check_folder_name_exists", new_callable=AsyncMock) as mock_check,
    ):
        mock_check.return_value = False
        mock_folder = MagicMock()
        mock_folder.id = "folder_123"
        mock_folder.name = "New Folder"
        mock_folder.parent_id = None
        mock_folder.created_at = datetime.now()
        mock_folder.updated_at = datetime.now()
        mock_create.return_value = mock_folder

        response = client.post(
            "/api/education-ai/eduvideo/v0/workspace/folder",
            json={"name": "New Folder", "parent_id": None},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0


def test_get_workspace_contents(client, auth_headers, mock_db_session):
    """Test GET workspace contents endpoint."""
    mock_res = MagicMock()
    mock_res.scalar.return_value = 0
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    mock_res.scalars.return_value = mock_scalars
    mock_res.all.return_value = []
    mock_db_session.execute.return_value = mock_res

    response = client.get(
        "/api/education-ai/eduvideo/v0/workspace",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["code"] == 0
    assert "items" in data["data"]


def test_rename_folder(client, auth_headers):
    """Test PUT folder endpoint."""
    with (
        patch.object(RealWorkspaceDAL, "update_folder_name", new_callable=AsyncMock) as mock_rename,
        patch.object(RealWorkspaceDAL, "query_folder_by_id", new_callable=AsyncMock) as mock_query,
        patch.object(RealWorkspaceDAL, "check_folder_name_exists", new_callable=AsyncMock) as mock_check,
    ):
        mock_query.return_value = MagicMock(id="folder_123", name="Old Folder", parent_id=None)
        mock_check.return_value = False
        mock_rename.return_value = True

        response = client.put(
            "/api/education-ai/eduvideo/v0/workspace/folder/folder_123",
            json={"name": "Renamed Folder"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0


def test_delete_folder(client, auth_headers):
    """Test DELETE folder endpoint."""
    with (
        patch.object(RealWorkspaceDAL, "delete_folder", new_callable=AsyncMock) as mock_delete,
        patch.object(RealWorkspaceDAL, "query_folder_by_id", new_callable=AsyncMock) as mock_query,
    ):
        mock_query.return_value = MagicMock(id="folder_123")
        mock_delete.return_value = True

        response = client.delete("/api/education-ai/eduvideo/v0/workspace/folder/folder_123", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0


def test_get_upload_presigned_url(client, auth_headers):
    """Test GET storage presigned URL endpoint."""
    with patch.object(StorageDAL, "generate_upload_presigned_url", new_callable=AsyncMock) as mock_presigned:
        mock_presigned.return_value = "http://storage.local/upload"

        response = client.get(
            "/api/education-ai/storage/v0/upload/presigned_url",
            params={"file_name": "asset.png"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert "upload_url" in data["data"]
