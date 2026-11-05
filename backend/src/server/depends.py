# -*- coding: utf-8 -*-
'''
@File    :   depends.py
@Author  :   一力辉
'''


from collections.abc import AsyncGenerator
from typing import Annotated, TypeVar
from fastapi import Header, Depends, Request
from src.server.schema.request import RequestHeader
from sqlalchemy.ext.asyncio import AsyncSession
from src.middleware.database.engine import async_session_maker

class _HeaderInfo(RequestHeader):
    """请求头信息"""
    accept_language: str

    def __init__(
        self,
        user_id: str = "admin",
        organization_id: str = "tester",
        request_id: str = "",
        cookie: str = "",
        accept_language: str = "zh-CN",
    ):
        super().__init__(
            user_id=user_id,
            organization_id=organization_id,
            request_id=request_id,
            cookie=cookie,
            accept_language=accept_language,
        )

    @property
    def language(self) -> str:
        if not self.accept_language:
            return "zh-CN"
        first = str(self.accept_language).split(",")[0].strip().lower()
        if "en" in first:
            return "en"
        return "zh-CN"
    
    def __str__(self):
        return f"user-id: {self.user_id} request-id: {self.request_id} accept-language: {self.accept_language} cookie: {self.cookie}"
    
    def __repr__(self):
        return self.__str__()


def get_header_info(
    request: Request,
    user_id: str = Header("admin", alias="user-id", description="用户ID"),
    organization_id: str = Header("tester", alias="organization-id", description="组织ID"),
    request_id: str = Header("", alias="request-id", description="请求ID"),
    cookie: str = Header("", alias="cookie", description="cookie"),
    accept_language: str | None = Header(None, alias="accept-language", description="语言"),
) -> _HeaderInfo:
    raw_lang = (
        accept_language
        or request.headers.get("accept-language")
        or request.headers.get("Accept-Language")
        or "zh-CN"
    )
    return _HeaderInfo(
        user_id=user_id,
        organization_id=organization_id,
        request_id=request_id,
        cookie=cookie,
        accept_language=raw_lang,
    )


HeaderInfo = Annotated[_HeaderInfo, Depends(get_header_info)]

################################## db session ##################################
async def get_db_session(_: Request) -> AsyncGenerator[AsyncSession, None]:
    """获取数据库连接"""
    session: AsyncSession = async_session_maker()
    try:
        yield session
    finally:
        await session.close()

DBSession = Annotated[AsyncSession, Depends(get_db_session)]

T = TypeVar("T")
def register_dal(cls: type[T]) -> type[T]:
    def _init_dal(db: DBSession) -> T:
        return cls(db)

    return Annotated[cls, Depends(_init_dal)]