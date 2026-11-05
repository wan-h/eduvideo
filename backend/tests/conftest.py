# -*- coding: utf-8 -*-
"""
Pytest shared fixtures for backend tests.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.server.app import create_app
from src.server.depends import get_db_session


@pytest.fixture
def mock_db_session():
    """Mock AsyncSession for database operations."""
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.close = AsyncMock()
    exec_res = MagicMock()
    exec_res.all.return_value = []
    exec_res.scalars.return_value.all.return_value = []
    exec_res.scalar.return_value = None
    exec_res.scalar_one_or_none.return_value = None

    session.execute = AsyncMock(return_value=exec_res)
    session.scalar = AsyncMock(return_value=None)
    session.scalars = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=[])))

    # Mock async context manager for async with session.begin():
    cm = AsyncMock()
    cm.__aenter__.return_value = session
    cm.__aexit__.return_value = None
    session.begin = MagicMock(return_value=cm)
    return session


@pytest.fixture
def app(mock_db_session) -> FastAPI:
    """FastAPI application instance with overridden dependencies."""
    app_instance = create_app()

    # Override DB session dependency
    async def override_get_db_session():
        yield mock_db_session

    app_instance.dependency_overrides[get_db_session] = override_get_db_session

    return app_instance


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    """Synchronous FastAPI TestClient."""
    with patch("src.server.app.get_temporal_client", new_callable=AsyncMock) as mock_temporal:
        mock_temporal.return_value = MagicMock()
        with TestClient(app, raise_server_exceptions=False) as test_client:
            yield test_client


@pytest.fixture
def auth_headers():
    """Standard authentication and context headers."""
    return {
        "user-id": "tester",
        "organization-id": "tester_org",
        "request-id": "test_req_123",
    }
