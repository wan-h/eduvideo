# -*- coding: utf-8 -*-
"""
Unit tests for background Task Schemas and activities (src/tasks/*).
"""

import asyncio
from unittest.mock import AsyncMock, patch

from src.schema import LANGUAGE_TYPE, SUBJECT_TYPE, TASK_STATUS, TASK_TYPE, RequestInfo
from src.tasks.base.schema import TaskStatusUpdateParams
from src.tasks.doc_parse.schema import DocParseReq, DocParseResult
from src.tasks.question_explanation_video_gen.video_synthesis import activities as video_synthesis_activities
from src.tasks.readable_tts.schema import ReadableTTSReq, Text2SpeechResult
from src.tasks.schema import FileDesc
from src.utils import config


def test_base_task_schemas():
    req_info = RequestInfo(request_id="r1", user_id="u1", organization_id="org1")

    status_params = TaskStatusUpdateParams(
        resquest_info=req_info,
        task_id="t1",
        task_type=TASK_TYPE.DOC_PARSE,
        status=TASK_STATUS.STARTED,
        progress=50,
    )
    assert status_params.task_id == "t1"
    assert status_params.progress == 50


def test_doc_parse_schema():
    req = DocParseReq(url="http://file.pdf")
    assert req.url == "http://file.pdf"

    res = DocParseResult(
        source_url="http://file.pdf",
        md_content="# Content",
        content_list_v1="[]",
        content_list_v2="[]",
        middle_json="{}",
        model_output="output",
        images={},
        page_count=1,
    )
    assert res.md_content == "# Content"


def test_readable_tts_schema():
    req = ReadableTTSReq(
        text="Sample text",
        voice="zh_female_putonghua",
        speed=1.0,
        subject=SUBJECT_TYPE.MATH,
        language=LANGUAGE_TYPE.CHINESE,
    )
    assert req.text == "Sample text"

    res = Text2SpeechResult(url="http://audio.mp3", text="Sample text", duration=5000)
    assert res.url == "http://audio.mp3"


def test_preload_remote_assets_reads_own_storage_from_s3(tmp_path):
    """本服务存储 URL 必须预下载（走内网 S3），不能因其域名是 localhost 被跳过"""

    async def _impl():
        storage_url = f"{config.middleware.storage.domain}/education-ai/users/u1/public/a.mp3"
        local_url = "http://127.0.0.1:4321/asset_local.mp3"
        input_dict = {
            "scenes": {
                "question_introduction": {"subtitles": [{"audio": storage_url}]},
                "question_solution": {"segments": [{"subtitles": [{"audio": local_url}]}]},
                "question_key_points": {"segments": []},
            },
            "video_settings": {},
        }

        with (
            patch.object(video_synthesis_activities, "download_file", new_callable=AsyncMock) as mock_download,
            patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get,
        ):
            mock_download.return_value = FileDesc(
                content=b"mp3", s3_url=storage_url, filename="a.mp3", content_type="audio/mpeg"
            )
            result = await video_synthesis_activities._preload_remote_assets(input_dict, str(tmp_path), 4321)

        # 存储 URL 走内网 S3，未发起 HTTP 请求；本地资源服务 URL 保持不变
        mock_get.assert_not_awaited()
        assert mock_download.await_count == 1
        assert result["scenes"]["question_introduction"]["subtitles"][0]["audio"].startswith(
            "http://127.0.0.1:4321/asset_"
        )
        assert result["scenes"]["question_solution"]["segments"][0]["subtitles"][0]["audio"] == local_url

    asyncio.run(_impl())


def test_preload_remote_assets_localizes_markdown_images(tmp_path):
    """题干、选项与讲解正文中的 markdown/HTML 图片必须预下载并替换为本地资源服务 URL"""

    async def _impl():
        img_url = f"{config.middleware.storage.domain}/education-ai/users/u1/public/a.png"
        option_img_url = f"{config.middleware.storage.domain}/education-ai/users/u1/public/b.png"
        input_dict = {
            "scenes": {
                "question_introduction": {
                    "stem": f"题图 ![示意图]({img_url})",
                    "options": [f'<img src="{option_img_url}" alt="选项图">'],
                    "subtitles": [],
                },
                "question_solution": {"segments": [{"content": f"正文 ![]({img_url})", "subtitles": []}]},
                "question_key_points": {"segments": []},
            },
            "video_settings": {},
        }

        with (
            patch.object(video_synthesis_activities, "download_file", new_callable=AsyncMock) as mock_download,
            patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get,
        ):
            mock_download.return_value = FileDesc(
                content=b"png", s3_url=img_url, filename="a.png", content_type="image/png"
            )
            result = await video_synthesis_activities._preload_remote_assets(input_dict, str(tmp_path), 4321)

        # 图片 URL 全部走内网 S3，未发起 HTTP 请求；重复引用的同一 URL 只下载一次
        mock_get.assert_not_awaited()
        assert mock_download.await_count == 2
        intro = result["scenes"]["question_introduction"]
        assert "127.0.0.1:4321/asset_" in intro["stem"]
        assert "127.0.0.1:4321/asset_" in intro["options"][0]
        assert "127.0.0.1:4321/asset_" in result["scenes"]["question_solution"]["segments"][0]["content"]

    asyncio.run(_impl())
