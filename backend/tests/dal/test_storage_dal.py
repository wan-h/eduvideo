# -*- coding: utf-8 -*-
"""
Unit tests for StorageDAL.
"""

import asyncio
from unittest.mock import AsyncMock, patch

from src.server.dal.storage import StorageDAL


def test_storage_dal_get_path():
    path = StorageDAL.get_path("user123", "test.mp4", tag="video", include_domain=False, include_prefix=True)
    assert "users/user123/video/test.mp4" in path


def test_storage_dal_upload_file():
    async def _impl():
        with patch(
            "src.middleware.storage.client.AsyncStorageClient.upload_file", new_callable=AsyncMock
        ) as mock_upload:
            mock_upload.return_value = "http://storage.local/test.mp4"

            url = await StorageDAL.upload_file("user123", "test.mp4", b"data", tag="video", content_type="video/mp4")

            assert url == "http://storage.local/test.mp4"
            mock_upload.assert_awaited_once()

    asyncio.run(_impl())


def test_storage_dal_download_file():
    async def _impl():
        with patch(
            "src.middleware.storage.client.AsyncStorageClient.download_file", new_callable=AsyncMock
        ) as mock_download:
            mock_download.return_value = AsyncMock()

            res = await StorageDAL.download_file("user123", "test.mp4", tag="video")

            assert res is not None
            mock_download.assert_awaited_once()

    asyncio.run(_impl())


def test_storage_dal_generate_upload_presigned_url():
    async def _impl():
        with patch(
            "src.middleware.storage.client.AsyncStorageClient.generate_upload_presigned_url", new_callable=AsyncMock
        ) as mock_url:
            mock_url.return_value = "http://upload.url"

            url = await StorageDAL.generate_upload_presigned_url("user123", "test.mp4")

            assert url == "http://upload.url"
            mock_url.assert_awaited_once()

    asyncio.run(_impl())


def test_storage_dal_check_file_exist():
    async def _impl():
        with patch(
            "src.middleware.storage.client.AsyncStorageClient.check_file_exist", new_callable=AsyncMock
        ) as mock_check:
            mock_check.return_value = True

            exist = await StorageDAL.check_file_exist("user123", "test.mp4")

            assert exist is True
            mock_check.assert_awaited_once()

    asyncio.run(_impl())
