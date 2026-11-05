#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库迁移入口。

流程:
    1. 确保目标数据库存在
    2. 兼容 create_all 建表的历史库: 校验结构与当前模型一致后 stamp head
    3. alembic upgrade head

使用方式:
    python scripts/migrate.py

docker-compose 中由一次性服务 srv-education-api-migrate 调用，
API 与 Workers 通过 depends_on: service_completed_successfully 等待其完成。
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config as AlembicConfig
from alembic.runtime.migration import MigrationContext
from sqlalchemy import inspect

import src.server.models  # noqa: F401  确保 Base.metadata 包含全部模型
from src.middleware.database.engine import Base, sync_engine
from src.server.dal.base import create_database_if_not_exists
from src.utils import logger


def build_alembic_config() -> AlembicConfig:
    cfg = AlembicConfig(str(BACKEND_DIR / "alembic.ini"))
    # 使用绝对路径，避免以不同工作目录启动时找不到迁移脚本
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    return cfg


def collect_schema_diff() -> list:
    with sync_engine.connect() as connection:
        context = MigrationContext.configure(connection, opts={"compare_type": True})
        return compare_metadata(context, Base.metadata)


def main() -> None:
    create_database_if_not_exists()

    existing_tables = set(inspect(sync_engine).get_table_names())
    # create_all 建表的历史库没有 alembic_version，直接 upgrade 会因表已存在而失败:
    # 仅在结构与当前模型完全一致时 stamp head 纳入管理，否则报错交由人工处理
    is_legacy_db = "alembic_version" not in existing_tables and bool(
        existing_tables & set(Base.metadata.tables)
    )

    cfg = build_alembic_config()
    if is_legacy_db:
        diffs = collect_schema_diff()
        if diffs:
            raise RuntimeError(
                f"历史库结构与当前模型存在 {len(diffs)} 处差异，"
                "请先手动确认并生成对应迁移，勿直接 stamp head"
            )
        logger.warning("检测到未纳入 Alembic 管理的历史库，标记为当前最新版本(stamp head)")
        command.stamp(cfg, "head")

    command.upgrade(cfg, "head")
    logger.info("数据库迁移完成: alembic upgrade head")


if __name__ == "__main__":
    main()