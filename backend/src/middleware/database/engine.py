# -*- coding: utf-8 -*-
"""
@File    : database.py
@Author  : 一力辉
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, create_engine
from sqlalchemy.ext.asyncio import AsyncAttrs, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from src.utils import config


class Base(AsyncAttrs, DeclarativeBase):
    created_at = Column(DateTime, nullable=False, doc="创建时间", default=datetime.now)
    updated_at = Column(DateTime, nullable=True, doc="更新时间", onupdate=datetime.now)
    deleted_at = Column(DateTime, nullable=True, doc="删除时间")

engine_url = f'postgresql+psycopg://{config.middleware.database.user}:{config.middleware.database.passwd}@{config.middleware.database.host}:{config.middleware.database.port}/{config.middleware.database.db}'

async_engine = create_async_engine(
    url=engine_url,
    pool_pre_ping=True,  # 每次连接前 ping 一下，防止连接断开
    echo=True,  # echo 设为 True 会打印出实际执行的 sql，调试的时候更方便
    future=True,  # 使用 SQLAlchemy 2.0 API，向后兼容
    # 注意：使用 PgBouncer 时，建议使用较小的连接池或 NullPool
    # 因为 PgBouncer 已经负责连接池管理
    pool_size=5,  # 连接池的大小默认为 5 个，设置为 0 时表示连接无限制
    max_overflow=10,  # 添加溢出控制
    # 关键修改：缩短 pool_recycle 时间，必须小于 PgBouncer 的 server_idle_timeout (900s)
    # 设置为 280 秒，确保在网络设备/PgBouncer 断开前主动回收
    pool_recycle=280,
    pool_use_lifo=True,  # 使用后进先出的连接池
    pool_timeout=30,  # 添加连接超时
    execution_options={  # 关闭查询缓存
        "compiled_cache": None,
    },
    # 核心配置
    isolation_level="READ COMMITTED",
    connect_args={
        "prepare_threshold": None,  # 必须：PgBouncer transaction 模式不支持 prepared statements，None 表示禁用
        "autocommit": True,  # 禁用驱动层自动事务
        # TCP Keepalive 设置，防止连接被中间设备静默断开
        # 注意：这些值需要比网络设备的空闲超时更短
        "keepalives": 1,  # 启用 keepalive
        "keepalives_idle": 30,  # 30秒空闲后开始发送 keepalive（从60降低到30）
        "keepalives_interval": 10,  # 每10秒发送一次
        "keepalives_count": 3,  # 3次无响应后认为断开（从6降低到3，更快检测死连接）
        # 连接超时设置
        "connect_timeout": 10,  # 连接超时10秒
    },
)

sync_engine = create_engine(
    url=engine_url,
    pool_pre_ping=True
)

async_session_maker = async_sessionmaker(
    async_engine,
    expire_on_commit=False,
    autoflush=False,  # 禁用自动 flush，防止在只读查询中意外触发 UPDATE
)

sync_session_maker = sessionmaker(
    sync_engine,
    expire_on_commit=False,
    autoflush=False,  # 禁用自动 flush，防止在只读查询中意外触发 UPDATE
)

