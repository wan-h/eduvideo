# -*- coding: utf-8 -*-
'''
@File    :   exceptions.py
@Author  :   一力辉
'''

from fastapi import FastAPI, Request, status
from fastapi.exceptions import HTTPException as FastapiHTTPException
from src.server.schema.request import APIResponse
from src.utils import logger


class ServiceException(Exception):
    def __init__(self, status_code: int, api_code: int, message: str, data: str | None = None):
        self.status_code = status_code
        self.api_code = api_code
        self.message = message
        self.data = data
        super().__init__(message)

    def to_dict(self):
        return {
            "status_code": self.status_code,
            "api_code": self.api_code,
            "message": self.message,
        }

class AuthException(ServiceException):
    """权限问题"""
    status_code = status.HTTP_401_UNAUTHORIZED

    @classmethod
    def AccessDenied(cls, msg: str = ""):
        """禁止访问"""
        return cls(cls.status_code, 40102, f"Access Denied: {msg}")

class InvalidException(ServiceException):
    """无效请求"""
    status_code = status.HTTP_403_FORBIDDEN

    @classmethod
    def InvalidInput(cls, msg: str = ""):
        """无效输入"""
        return cls(cls.status_code, 40301, f"Invalid Input: {msg}")

    @classmethod
    def InvalidOperation(cls, msg: str = ""):
        """无效操作"""
        return cls(cls.status_code, 40302, f"Invalid Operation: {msg}")

    @classmethod
    def LimitExceeded(cls, msg: str = ""):
        """达到限制"""
        return cls(cls.status_code, 40303, f"Limit Exceeded: {msg}")

class NotFoundException(ServiceException):
    """未找到"""
    status_code = status.HTTP_404_NOT_FOUND
    
    @classmethod
    def NotFound(cls, msg: str = ""):
        """未找到"""
        return cls(cls.status_code, 40401, f"Not Found: {msg}")

class DependencyException(ServiceException):
    """连接问题"""
    status_code = status.HTTP_424_FAILED_DEPENDENCY

    @classmethod
    def ServiceUnavailable(cls, msg: str = ""):
        """配置服务不可用"""
        return cls(cls.status_code, 42401, f"Service Unavailable: {msg}")

async def exception_hander(_: Request, exc: Exception) -> APIResponse:
    logger.exception(exc)
    if isinstance(exc, ServiceException):
        return APIResponse(
            status_code=exc.status_code,
            api_code=exc.api_code,
            message=exc.message,
            data=exc.data
        )
    elif isinstance(exc, FastapiHTTPException):
        return APIResponse(
            status_code=exc.status_code,
            api_code=getattr(exc, "api_code", -1),
            message=exc.detail,
        )
    else:
        return APIResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            api_code=-1,
            message="Internal Error",
        )

def register(app: FastAPI) -> None:
    app.add_exception_handler(Exception, handler=exception_hander)
