# -*- coding: utf-8 -*-
'''
@File    :   request.py
@Author  :   一力辉
'''



from src.schema import RequestInfo
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Any

# ========================= server schema =======================
class RequestHeader(RequestInfo):
    cookie: str = Field(..., description="Cookie")

class BaseResponse(BaseModel):
    code: int = Field(0, description="状态码")
    message: str = Field("success", description="消息")
    data: Any = Field(None, description="数据")

class APIResponse(JSONResponse):
    def __init__(self, status_code: int, api_code: int, message: str, data: str | None = None):
        super(APIResponse, self).__init__({"code": api_code, "message": message, "data": data}, status_code=status_code)