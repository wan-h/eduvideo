# -*- coding: utf-8 -*-
'''
@File    :   base.py
@Author  :   一力辉
'''


from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils import config, logger

class BaseDatabaseDAL:
    def __init__(self, session: AsyncSession) -> None:
        self.session: AsyncSession = session

# 只负责建数据库，表结构统一由 Alembic 迁移管理(scripts/migrate.py)
def create_database_if_not_exists():
    postgres_url = f'postgresql+psycopg://{config.middleware.database.user}:{config.middleware.database.passwd}@{config.middleware.database.host}:{config.middleware.database.port}/postgres'
    db_name = config.middleware.database.db
    
    # 使用 AUTOCOMMIT 隔离级别以允许执行 CREATE DATABASE
    temp_engine = create_engine(postgres_url, isolation_level="AUTOCOMMIT")
    try:
        with temp_engine.connect() as conn:
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname='{db_name}'"))
            exists = result.scalar()
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                logger.info(f"Database '{db_name}' created successfully.")
            else:
                logger.debug(f"Database '{db_name}' already exists.")
    except Exception as e:
        logger.error(f"Failed to check/create database '{db_name}': {e}")
    finally:
        temp_engine.dispose()