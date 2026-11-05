# -*- coding: utf-8 -*-
"""
Unit tests for server exceptions, exception handlers, and dependencies.
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.exceptions import HTTPException as FastapiHTTPException

from src.server.depends import _HeaderInfo, get_db_session
from src.server.exceptions import (
    AuthException,
    DependencyException,
    InvalidException,
    NotFoundException,
    ServiceException,
    exception_hander,
)


def test_service_exceptions():
    exc = ServiceException(400, 40001, "Error msg", "extra data")
    assert exc.to_dict() == {"status_code": 400, "api_code": 40001, "message": "Error msg"}

    auth_exc = AuthException.AccessDenied("denied")
    assert auth_exc.status_code == 401
    assert auth_exc.api_code == 40102

    inv_exc1 = InvalidException.InvalidInput("bad input")
    assert inv_exc1.api_code == 40301

    inv_exc2 = InvalidException.InvalidOperation("bad op")
    assert inv_exc2.api_code == 40302

    inv_exc3 = InvalidException.LimitExceeded("limit")
    assert inv_exc3.api_code == 40303

    nf_exc = NotFoundException.NotFound("missing")
    assert nf_exc.api_code == 40401

    dep_exc = DependencyException.ServiceUnavailable("unavail")
    assert dep_exc.api_code == 42401


def test_exception_handler():
    async def _impl():
        req = MagicMock()

        # ServiceException
        resp1 = await exception_hander(req, InvalidException.InvalidInput("invalid"))
        assert resp1.status_code == 403

        # FastapiHTTPException
        resp2 = await exception_hander(req, FastapiHTTPException(status_code=400, detail="bad http"))
        assert resp2.status_code == 400

        # Generic Exception
        resp3 = await exception_hander(req, RuntimeError("unexpected error"))
        assert resp3.status_code == 500

    asyncio.run(_impl())


def test_header_info():
    header = _HeaderInfo(user_id="user_123", organization_id="org_123", request_id="req_123", cookie="c=1")
    assert header.user_id == "user_123"
    assert "user-id: user_123" in str(header)
    assert repr(header) == str(header)


def test_get_db_session():
    async def _impl():
        with patch("src.server.depends.async_session_maker") as mock_maker:
            mock_sess = AsyncMock()
            mock_maker.return_value = mock_sess

            req = MagicMock()
            gen = get_db_session(req)
            session = await anext(gen)
            assert session == mock_sess

            with pytest.raises(StopAsyncIteration):
                await anext(gen)
            mock_sess.close.assert_awaited_once()

    asyncio.run(_impl())
