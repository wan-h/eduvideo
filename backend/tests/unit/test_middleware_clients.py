# -*- coding: utf-8 -*-
"""
Unit tests for middleware storage and temporal client wrappers.
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from src.middleware.storage.client import AsyncStorageClient
from src.middleware.temporalio import client as temporal_module
from src.schema import FileObjectInfo


def test_async_storage_client_upload_bytes():
    async def _impl():
        with patch("src.middleware.storage.client.s3_session.client") as mock_client_ctx:
            mock_s3 = AsyncMock()
            mock_client_ctx.return_value.__aenter__.return_value = mock_s3

            obj_info = FileObjectInfo(data=b"hello bytes", metadata={"author": "test"})
            url = await AsyncStorageClient.upload_file("test.txt", obj_info, "mybucket")

            assert "test.txt" in url
            mock_s3.upload_fileobj.assert_awaited_once()

    asyncio.run(_impl())


def test_async_storage_client_upload_filepath():
    async def _impl():
        with patch("src.middleware.storage.client.s3_session.client") as mock_client_ctx:
            mock_s3 = AsyncMock()
            mock_client_ctx.return_value.__aenter__.return_value = mock_s3

            obj_info = FileObjectInfo(data="/tmp/fake.png", metadata={})
            url = await AsyncStorageClient.upload_file("fake.png", obj_info, "mybucket")

            assert "fake.png" in url
            mock_s3.upload_file.assert_awaited_once()

    asyncio.run(_impl())


def test_async_storage_client_download_and_metadata():
    async def _impl():
        with patch("src.middleware.storage.client.s3_session.client") as mock_client_ctx:
            mock_s3 = AsyncMock()
            mock_client_ctx.return_value.__aenter__.return_value = mock_s3

            mock_body = AsyncMock()
            mock_body.read.return_value = b"file content"
            mock_s3.get_object.return_value = {"Body": mock_body}
            mock_s3.head_object.return_value = {"Metadata": {"key": "val"}, "ContentType": "text/plain"}

            obj = await AsyncStorageClient.download_file("test.txt", "mybucket")
            assert obj.data == b"file content"
            assert obj.metadata == {"key": "val"}

            meta = await AsyncStorageClient.get_file_metadata("test.txt", "mybucket")
            assert meta == {"key": "val"}

            await AsyncStorageClient.generate_upload_presigned_url("test.txt", "mybucket", "text/plain")
            mock_s3.generate_presigned_url.assert_awaited_once()

            exists = await AsyncStorageClient.check_file_exist("test.txt", "mybucket")
            assert exists is True

            # check_file_exist failure branch
            mock_s3.head_object.side_effect = Exception("Not found")
            not_exists = await AsyncStorageClient.check_file_exist("nonexistent.txt", "mybucket")
            assert not_exists is False

    asyncio.run(_impl())


def test_async_storage_client_delete_folder():
    async def _impl():
        with patch("src.middleware.storage.client.s3_session.client") as mock_client_ctx:
            mock_s3 = AsyncMock()
            mock_client_ctx.return_value.__aenter__.return_value = mock_s3

            class MockPaginator:
                def paginate(self, Bucket, Prefix):
                    class MockAsyncIterable:
                        def __aiter__(self):
                            return self

                        async def __anext__(self):
                            if getattr(self, "done", False):
                                raise StopAsyncIteration
                            self.done = True
                            return {"Contents": [{"Key": "folder/file1.txt"}]}

                    return MockAsyncIterable()

            mock_s3.get_paginator = MagicMock(return_value=MockPaginator())

            await AsyncStorageClient.delete_folder("folder/", "mybucket")
            mock_s3.delete_objects.assert_awaited_once()

    asyncio.run(_impl())


def test_get_temporal_client():
    async def _impl():
        with patch("temporalio.client.Client.connect", new_callable=AsyncMock) as mock_connect:
            mock_c = MagicMock()
            mock_c.workflow_service.describe_namespace = AsyncMock()
            mock_connect.return_value = mock_c

            temporal_module._client = None
            client = await temporal_module.get_temporal_client()
            assert client == mock_c

            # Second call returns cached client
            client_cached = await temporal_module.get_temporal_client()
            assert client_cached == mock_c

    asyncio.run(_impl())
