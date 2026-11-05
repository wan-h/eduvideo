# -*- coding: utf-8 -*-
"""
readable_tts 工具函数测试：MiniMax 直连 TTS 分支。
"""

import asyncio

import pytest

from src.schema import MODEL_PROVIDER, SUBJECT_TYPE
from src.tasks.readable_tts import utils


class _FakeResponse:
    def __init__(self, payload: dict):
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


class _FakeAsyncClient:
    payload: dict = {}
    last_request: dict = {}

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, **kwargs):
        type(self).last_request = {"url": url, **kwargs}
        return _FakeResponse(type(self).payload)


def _run_minimax_tts(model: str, payload: dict, monkeypatch) -> bytes:
    _FakeAsyncClient.payload = payload
    _FakeAsyncClient.last_request = {}
    monkeypatch.setattr(utils.httpx, "AsyncClient", _FakeAsyncClient)
    return asyncio.run(
        utils.provider_tts(
            provider=MODEL_PROVIDER.MINIMAX,
            subject_type=SUBJECT_TYPE.MATH,
            model=model,
            base_url="https://api.minimax.cn/v1/t2a_v2",
            api_key="test-key",
            text="hello",
            voice="female-shaonv-jingpin",
            spped=1.0,
        )
    )


def test_minimax_provider_tts(monkeypatch):
    audio = b"fake-mp3-bytes"
    result = _run_minimax_tts(
        "speech-2.8-turbo",
        {"data": {"audio": audio.hex()}, "base_resp": {"status_code": 0, "status_msg": "success"}},
        monkeypatch,
    )

    assert result == audio
    request = _FakeAsyncClient.last_request
    assert request["url"] == "https://api.minimax.cn/v1/t2a_v2"
    assert request["json"]["voice_setting"]["voice_id"] == "female-shaonv-jingpin"
    assert request["json"]["audio_setting"]["format"] == "mp3"
    assert request["json"]["stream"] is False


def test_minimax_provider_tts_strips_dashscope_model_prefix(monkeypatch):
    _run_minimax_tts(
        "MiniMax/speech-2.8-turbo",
        {"data": {"audio": b"fake".hex()}, "base_resp": {"status_code": 0, "status_msg": "success"}},
        monkeypatch,
    )

    assert _FakeAsyncClient.last_request["json"]["model"] == "speech-2.8-turbo"


def test_minimax_provider_tts_business_error(monkeypatch):
    with pytest.raises(Exception, match="1004"):
        _run_minimax_tts(
            "speech-2.8-turbo",
            {"data": None, "base_resp": {"status_code": 1004, "status_msg": "auth failed"}},
            monkeypatch,
        )
