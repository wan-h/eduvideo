# -*- coding: utf-8 -*-
'''
@File    :   ai_assist_v0.py
@Author  :   Antigravity
'''

from fastapi import APIRouter, HTTPException

from src.utils import logger
from src.server.depends import HeaderInfo, DBSession
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

import uuid
from src.server.schema.ai_assist import AIEditReq, AIImageEditReq, AIImageEditData, AIImageEditResp
from src.server.services.ai_editor_service import AIEditorService

router = APIRouter(prefix="/eduvideo/v0/ai_assist")


@router.post("/edit", summary="Studio 富文本 AI 局部辅助编辑（SSE 流式）")
async def api_ai_edit(
    req: AIEditReq,
):
    async def event_stream():
        try:
            service = AIEditorService()

            async for event in service.generate_edit_stream(req):
                if event["type"] == "delta":
                    yield f"data: {json.dumps({'type': 'delta', 'content': event['content']}, ensure_ascii=False)}\n\n"
                elif event["type"] == "done":
                    done_payload = {
                        "type": "done",
                        "suggested_content": event["suggested_content"],
                        "change_summary": event["change_summary"],
                        "syntax_valid": event["syntax_valid"],
                        "token_usage": {
                            "prompt_tokens": event.get("prompt_tokens", 0),
                            "completion_tokens": event.get("completion_tokens", 0),
                        },
                    }
                    yield f"data: {json.dumps(done_payload, ensure_ascii=False)}\n\n"

        except Exception as e:
            logger.error(f"[ai_edit] streaming error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/edit_image", summary="Studio 富文本 AI 图片编辑魔法棒")
async def api_ai_edit_image(
    header: HeaderInfo,
    req: AIImageEditReq,
    session: DBSession,
) -> AIImageEditResp:
    try:
        service = AIEditorService()
        task_id = req.script_task_id or f"task_{uuid.uuid4().hex[:8]}"
        new_url = await service.edit_image(
            user_id=header.user_id,
            task_id=task_id,
            image_url=req.image_url,
            prompt=req.prompt,
        )
        return AIImageEditResp(
            data=AIImageEditData(
                new_image_url=new_url,
                change_summary="AI 图片编辑完成",
            )
        )
    except Exception as e:
        logger.error(f"[edit_image] error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI 图片编辑失败: {e}")


