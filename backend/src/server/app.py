# -*- coding: utf-8 -*-
'''
@File    :   app.py
@Author  :   一力辉
'''


from fastapi import FastAPI
from contextlib import asynccontextmanager
from src.server.api.task.task_v0 import router as tasks_router
from src.server.api.eduvideo.script_v0 import router as eduvideo_script_router
from src.server.api.eduvideo.synthesis_v0 import router as eduvideo_synthesis_router
from src.server.api.eduvideo.tts_v0 import router as eduvideo_tts_router
from src.server.api.eduvideo.workspace_v0 import router as eduvideo_workspace_router
from src.server.api.eduvideo.video_v0 import router as eduvideo_openai_router
from src.server.api.eduvideo.common_v0 import router as eduvideo_common_router
from src.server.api.eduvideo.conversation_v0 import router as eduvideo_conversation_router
from src.server.api.eduvideo.question_extract_v0 import router as eduvideo_question_extract_router
from src.server.api.eduvideo.ai_assist_v0 import router as eduvideo_ai_assist_router
from src.server.api.storage.storage_v0 import router as storage_router
from src.server.schema.request import BaseResponse
from src.utils import config
from src.server import exceptions
from src.server import middleware
from src.middleware.temporalio.client import get_temporal_client

__all__ = ["create_app"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.temporal_client = await get_temporal_client()
    yield

def create_app():
    app = FastAPI(
        title=config.common.name, 
        description=f"This is a cool set of apis for {config.common.name}",
        version=config.common.version,
        lifespan=lifespan
    )

    middleware.register(app)
    exceptions.register(app)

    GLOABLE_PREFIX = f"/api/{config.common.name}"
    # 路由
    app.include_router(tasks_router, prefix=GLOABLE_PREFIX, tags=["TASKS"])
    app.include_router(storage_router, prefix=GLOABLE_PREFIX, tags=["STORAGE"])
    app.include_router(eduvideo_common_router, prefix=GLOABLE_PREFIX, tags=["EDUVIDEO", "EDUVIDEO/COMMON"])
    app.include_router(eduvideo_script_router, prefix=GLOABLE_PREFIX, tags=["EDUVIDEO", "EDUVIDEO/SCRIPT"])
    app.include_router(eduvideo_synthesis_router, prefix=GLOABLE_PREFIX, tags=["EDUVIDEO", "EDUVIDEO/SYNTHESIS"])
    app.include_router(eduvideo_tts_router, prefix=GLOABLE_PREFIX, tags=["EDUVIDEO", "EDUVIDEO/TTS"])
    app.include_router(eduvideo_workspace_router, prefix=GLOABLE_PREFIX, tags=["EDUVIDEO", "EDUVIDEO/WORKSPACE"])
    app.include_router(eduvideo_openai_router, prefix=GLOABLE_PREFIX, tags=["EDUVIDEO", "EDUVIDEO/VIDEO"])
    app.include_router(eduvideo_conversation_router, prefix=GLOABLE_PREFIX, tags=["EDUVIDEO", "EDUVIDEO/CONVERSATION"])
    app.include_router(eduvideo_question_extract_router, prefix=GLOABLE_PREFIX, tags=["EDUVIDEO", "EDUVIDEO/QUESTION_EXTRACT"])
    app.include_router(eduvideo_ai_assist_router, prefix=GLOABLE_PREFIX, tags=["EDUVIDEO", "EDUVIDEO/AI_ASSIST"])


    @app.get("/health")
    async def health_check():
        return BaseResponse()

    return app

app = create_app()
