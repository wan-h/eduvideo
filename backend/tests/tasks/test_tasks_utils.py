# -*- coding: utf-8 -*-
"""
Unit tests for tasks utility functions (src/tasks/utils.py).
"""

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from src.schema import MODEL_PROVIDER, FileObjectInfo
from src.tasks.schema import FileDesc
from src.tasks.utils import (
    build_image_content_parts,
    convert_doc_to_pdf,
    convert_file_to_data_url,
    download_file,
    replace_image_url,
    request_image_bytes,
    upload_file,
)
from src.utils import config


def test_convert_file_to_data_url():
    res = convert_file_to_data_url(b"test data", "image/png")
    assert res.startswith("data:image/png;base64,")


def test_convert_doc_to_pdf():
    with patch("shutil.which", return_value=None):
        res = convert_doc_to_pdf(b"doc data", "test.docx")
        assert res is None


def test_download_file():
    async def _impl():
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_resp = MagicMock()
            mock_resp.content = b"file content"
            mock_resp.raise_for_status = MagicMock()
            mock_get.return_value = mock_resp

            file_desc = await download_file("http://storage.local/path/image.png")
            assert file_desc.filename == "image.png"
            assert file_desc.content == b"file content"

    asyncio.run(_impl())


def test_download_file_from_own_storage_uses_internal_s3():
    async def _impl():
        storage_url = f"{config.middleware.storage.domain}/education-ai/users/u1/public/a.png"
        with (
            patch("src.tasks.utils.AsyncStorageClient.download_file", new_callable=AsyncMock) as mock_download,
            patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get,
        ):
            mock_download.return_value = FileObjectInfo(data=b"png", content_type="image/png")

            file_desc = await download_file(storage_url)

        # 本服务对象存储 URL 不应再发起 HTTP 请求（容器内 domain 指向自身入口，必然连不上）
        mock_get.assert_not_awaited()
        assert mock_download.await_args.kwargs["object_name"] == "education-ai/users/u1/public/a.png"
        assert file_desc.filename == "a.png"
        assert file_desc.content == b"png"

    asyncio.run(_impl())


def test_download_file_from_own_storage_with_other_domain():
    """URL 前缀与当前进程 storage 配置不一致时，仍按对象键结构识别为本服务存储"""

    async def _impl():
        # 其他进程（如 API）用入口地址 http://localhost:80/storage 拼出的 URL
        storage_url = "http://localhost:80/storage/education-ai/users/u1/public/a.png"
        with (
            patch("src.tasks.utils.AsyncStorageClient.download_file", new_callable=AsyncMock) as mock_download,
            patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get,
        ):
            mock_download.return_value = FileObjectInfo(data=b"png", content_type="image/png")

            file_desc = await download_file(storage_url)

        mock_get.assert_not_awaited()
        assert mock_download.await_args.kwargs["object_name"] == "education-ai/users/u1/public/a.png"
        assert file_desc.content == b"png"

    asyncio.run(_impl())


def test_upload_file_path_and_bytes():
    async def _impl():
        with patch("src.server.dal.storage.StorageDAL.upload_file", new_callable=AsyncMock) as mock_upload:
            mock_upload.return_value = "http://storage.local/uploaded.png"

            # 1. file_path
            url1 = await upload_file("u1", "t1", "f1.png", file_path="/tmp/f1.png")
            assert url1 == "http://storage.local/uploaded.png"

            # 2. base64 data string
            data_str = "data:image/png;base64,aGVsbG8="
            url2 = await upload_file("u1", "t1", "f2.png", file_data=data_str)
            assert url2 == "http://storage.local/uploaded.png"

            # 3. raw bytes
            url3 = await upload_file("u1", "t1", "f3.png", file_data=b"raw bytes")
            assert url3 == "http://storage.local/uploaded.png"

    asyncio.run(_impl())


def test_build_image_content_parts_with_url(monkeypatch):
    async def _impl():
        monkeypatch.setattr(config.common, "llm_image_input", "url")
        parts = await build_image_content_parts(["http://example.com/a.png"])
        assert parts == [{"type": "image_url", "image_url": {"url": "http://example.com/a.png"}}]

    asyncio.run(_impl())


def test_build_image_content_parts_with_base64(monkeypatch):
    async def _impl():
        monkeypatch.setattr(config.common, "llm_image_input", "base64")
        storage_url = f"{config.middleware.storage.domain}/education-ai/users/u1/public/a.png"
        with patch("src.tasks.utils.AsyncStorageClient.download_file", new_callable=AsyncMock) as mock_download:
            mock_download.return_value = FileObjectInfo(data=b"png", content_type="image/png")
            parts = await build_image_content_parts([storage_url, "data:image/png;base64,cG5n"])

        # 本地存储图片走内网 S3 读取，data url 直接透传
        assert mock_download.await_count == 1
        assert mock_download.await_args.kwargs["object_name"] == "education-ai/users/u1/public/a.png"
        assert parts[0]["image_url"]["url"].startswith("data:image/png;base64,")
        assert parts[1]["image_url"]["url"] == "data:image/png;base64,cG5n"

    asyncio.run(_impl())


def test_request_image_bytes_with_gpt_image():
    async def _impl():
        client = MagicMock()
        client.images.edit = AsyncMock(return_value=MagicMock(data=[SimpleNamespace(b64_json="aW1n", url=None)]))

        res = await request_image_bytes(client, "gpt-image-2", "prompt", image=("a.png", b"src", "image/png"))

        assert res == b"img"
        # gpt-image 系列不支持 response_format，不得传该参数
        assert "response_format" not in client.images.edit.await_args.kwargs

    asyncio.run(_impl())


def test_request_image_bytes_with_aliyun_provider():
    async def _impl():
        client = MagicMock()
        client.base_url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
        client.api_key = "mock-key"
        response = MagicMock()
        response.json.return_value = {
            "output": {"choices": [{"message": {"content": [{"image": "http://example.com/a.png"}]}}]}
        }

        with (
            patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=response) as mock_post,
            patch("src.tasks.utils.download_file", new_callable=AsyncMock) as mock_download,
        ):
            mock_download.return_value = FileDesc(
                content=b"img", s3_url="http://example.com/a.png", filename="a.png", content_type="image/png"
            )
            res = await request_image_bytes(
                client,
                "wan2.6-image",
                "prompt",
                image=("a.png", b"src", "image/png"),
                provider=MODEL_PROVIDER.ALIYUN,
            )

        assert res == b"img"
        body = mock_post.await_args.kwargs["json"]
        assert body["model"] == "wan2.6-image"
        # 图片以 data url 传给 DashScope，不依赖外网可访问地址
        content = body["input"]["messages"][0]["content"]
        assert content[0]["image"].startswith("data:image/png;base64,")
        assert content[1]["text"] == "prompt"

    asyncio.run(_impl())


def test_request_image_bytes_with_other_model_fallback_url():
    async def _impl():
        client = MagicMock()
        client.images.generate = AsyncMock(
            return_value=MagicMock(data=[SimpleNamespace(b64_json=None, url="http://example.com/a.png")])
        )
        with patch("src.tasks.utils.download_file", new_callable=AsyncMock) as mock_download:
            mock_download.return_value = FileDesc(
                content=b"img", s3_url="http://example.com/a.png", filename="a.png", content_type="image/png"
            )
            res = await request_image_bytes(client, "dall-e-3", "prompt")

        assert res == b"img"
        # 非 gpt-image 模型显式要求 b64_json
        assert client.images.generate.await_args.kwargs["response_format"] == "b64_json"

    asyncio.run(_impl())


def test_replace_image_url():
    text = "![image](images/old1.jpg) markdown content ![image](images/old2.png)"
    results = {"old1.jpg": "http://new1.jpg", "old2.png": "http://new2.png"}
    replaced = replace_image_url(text, results)
    assert "http://new1.jpg" in replaced
    assert "http://new2.png" in replaced
