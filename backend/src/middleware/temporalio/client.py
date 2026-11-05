# -*- coding: utf-8 -*-
"""
@File    : client.py
@Author  : 一力辉
"""

import asyncio
from temporalio.client import Client
from temporalio.contrib.pydantic import pydantic_data_converter
from google.protobuf.duration_pb2 import Duration
from temporalio.api.workflowservice.v1 import RegisterNamespaceRequest, DescribeNamespaceRequest
from src.utils import config, logger

_client: Client | None = None
_client_lock = asyncio.Lock()


async def _ensure_namespace(client: Client) -> None:
    namespace = config.common.name
    try:
        await client.workflow_service.describe_namespace(
            DescribeNamespaceRequest(namespace=namespace)
        )
        logger.info(f"Namespace '{namespace}' already exists")
    except Exception:
        logger.info(f"Namespace '{namespace}' not found, creating...")
        retention = Duration()
        retention.FromSeconds(3 * 24 * 3600)  # 3 days in seconds
        await client.workflow_service.register_namespace(
            RegisterNamespaceRequest(
                namespace=namespace,
                description=f"Namespace for {config.common.name}",
                workflow_execution_retention_period=retention,
            )
        )
        logger.info(f"Namespace '{namespace}' created successfully")




async def get_temporal_client() -> Client:
    global _client
    if _client is not None:
        return _client
    async with _client_lock:
        if _client is not None:
            return _client
        logger.info(f"Connecting to Temporal server at {config.middleware.temporal.server_url}")
        client = await Client.connect(
            target_host=config.middleware.temporal.server_url,
            namespace=config.common.name,
            data_converter=pydantic_data_converter,
        )
        await _ensure_namespace(client)
        _client = client
        logger.info(f"Temporal client connected (namespace={config.common.name})")
        return _client