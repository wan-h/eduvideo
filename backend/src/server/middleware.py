# -*- coding: utf-8 -*-
'''
@File    :   middleware.py
@Author  :   一力辉
'''

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

class CustomMiddileware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        return response


def register(app: FastAPI) -> None:
    # app.add_middleware(CustomMiddileware)
    # CROS
    origins = [
        "*",
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )