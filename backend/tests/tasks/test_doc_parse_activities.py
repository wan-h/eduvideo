# -*- coding: utf-8 -*-
"""
Unit tests for doc parse activities (src/tasks/doc_parse/activities.py).
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from src.schema import FileObjectInfo
from src.tasks.doc_parse.activities import mineru_api
from src.utils import config


def _json_response(payload: dict) -> MagicMock:
    resp = MagicMock()
    resp.json = MagicMock(return_value=payload)
    resp.raise_for_status = MagicMock()
    return resp


def _content_response(content: bytes) -> MagicMock:
    resp = MagicMock()
    resp.content = content
    resp.raise_for_status = MagicMock()
    return resp


def test_mineru_api_uploads_local_storage_file():
    """本服务存储内的文件走 /file-urls/batch 上传，而不是把内网 URL 交给 MinerU"""

    async def _impl():
        storage_url = f"{config.middleware.storage.domain}/education-ai/users/u1/public/demo.pdf"
        apply_upload_resp = _json_response(
            {"code": 0, "data": {"batch_id": "batch-1", "file_urls": ["https://oss.example/upload"]}}
        )
        batch_status_resp = _json_response(
            {"code": 0, "data": {"extract_result": [{"state": "done", "full_zip_url": "https://cdn.example/r.zip"}]}}
        )

        with (
            patch(
                "src.tasks.doc_parse.activities.AsyncStorageClient.download_file", new_callable=AsyncMock
            ) as mock_download,
            patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post,
            patch("httpx.AsyncClient.put", new_callable=AsyncMock) as mock_put,
            patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get,
            patch("src.tasks.doc_parse.activities.asyncio.sleep", new_callable=AsyncMock),
        ):
            mock_download.return_value = FileObjectInfo(data=b"%PDF-1.4", content_type="application/pdf")
            mock_post.return_value = apply_upload_resp
            mock_put.return_value = MagicMock(raise_for_status=MagicMock())
            mock_get.side_effect = [batch_status_resp, _content_response(b"zip-bytes")]

            result = await mineru_api(storage_url)

        assert result == b"zip-bytes"
        # 内网 MinIO 读取，object key 与存储路径一致
        assert mock_download.await_args.kwargs["object_name"] == "education-ai/users/u1/public/demo.pdf"
        # 申请上传链接 + 上传文件，均不依赖文件 URL 对外可达
        assert mock_post.await_args.args[0].endswith("/file-urls/batch")
        assert mock_post.await_args.kwargs["json"]["files"][0]["name"] == "demo.pdf"
        assert mock_put.await_args.args[0] == "https://oss.example/upload"
        assert mock_put.await_args.kwargs["content"] == b"%PDF-1.4"
        assert mock_get.await_args_list[0].args[0].endswith("/extract-results/batch/batch-1")

    asyncio.run(_impl())


def test_mineru_api_uploads_when_storage_domain_differs():
    """URL 前缀与当前进程 storage 配置不一致时，仍走上传路径，不把内网 URL 交给 MinerU"""

    async def _impl():
        storage_url = "http://localhost:80/storage/education-ai/users/u1/public/demo.png"
        apply_upload_resp = _json_response(
            {"code": 0, "data": {"batch_id": "batch-1", "file_urls": ["https://oss.example/upload"]}}
        )
        batch_status_resp = _json_response(
            {"code": 0, "data": {"extract_result": [{"state": "done", "full_zip_url": "https://cdn.example/r.zip"}]}}
        )

        with (
            patch(
                "src.tasks.doc_parse.activities.AsyncStorageClient.download_file", new_callable=AsyncMock
            ) as mock_download,
            patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post,
            patch("httpx.AsyncClient.put", new_callable=AsyncMock) as mock_put,
            patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get,
            patch("src.tasks.doc_parse.activities.asyncio.sleep", new_callable=AsyncMock),
        ):
            mock_download.return_value = FileObjectInfo(data=b"png", content_type="image/png")
            mock_post.return_value = apply_upload_resp
            mock_put.return_value = MagicMock(raise_for_status=MagicMock())
            mock_get.side_effect = [batch_status_resp, _content_response(b"zip-bytes")]

            result = await mineru_api(storage_url)

        assert result == b"zip-bytes"
        assert mock_download.await_args.kwargs["object_name"] == "education-ai/users/u1/public/demo.png"
        assert mock_post.await_args.args[0].endswith("/file-urls/batch")

    asyncio.run(_impl())


def test_mineru_api_uses_extract_task_for_external_url():
    """外部公网 URL 仍走 /extract/task，由 MinerU 侧下载"""

    async def _impl():
        task_status_resp = _json_response(
            {"code": 0, "data": {"task_id": "task-1", "state": "done", "full_zip_url": "https://cdn.example/r.zip"}}
        )

        with (
            patch(
                "src.tasks.doc_parse.activities.AsyncStorageClient.download_file", new_callable=AsyncMock
            ) as mock_download,
            patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post,
            patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get,
            patch("src.tasks.doc_parse.activities.asyncio.sleep", new_callable=AsyncMock),
        ):
            mock_post.return_value = _json_response({"code": 0, "data": {"task_id": "task-1"}})
            mock_get.side_effect = [task_status_resp, _content_response(b"zip-bytes")]

            result = await mineru_api("https://example.com/demo.pdf")

        assert result == b"zip-bytes"
        mock_download.assert_not_awaited()
        assert mock_post.await_args.args[0].endswith("/extract/task")
        assert mock_post.await_args.kwargs["json"]["url"] == "https://example.com/demo.pdf"

    asyncio.run(_impl())
