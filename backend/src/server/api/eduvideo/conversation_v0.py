# -*- coding: utf-8 -*-
'''
@File    :   conversation_v0.py
@Author  :   一力辉
'''

import json
from enum import StrEnum
from datetime import datetime
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from openai import AsyncOpenAI
from sqlalchemy import select
from src.schema import STAGE_TYPE, SUBJECT_TYPE
from src.utils import config, logger
from src.server.depends import HeaderInfo, DBSession
from src.server.exceptions import InvalidException, NotFoundException
from src.server.schema.eduvideo import VideoScriptDesc
from src.server.schema.request import BaseResponse
from src.server.models.task import QuestionExplanationVideoGenScriptTask
from src.server.dal.eduvideo import ChatSessionDAL, ChatMessageDAL

router = APIRouter(prefix="/eduvideo/v0/conversation")


# ========================= 获取历史会话列表 ===========================

class SessionInfo(BaseModel):
    session_id: str = Field(..., description="会话ID")
    title: str = Field(..., description="会话标题")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="最后更新时间")

class SessionListResp(BaseResponse):
    class SessionListDesc(BaseModel):
        sessions: list[SessionInfo] = Field([], description="会话列表")
        total: int = Field(..., description="总数")
    data: SessionListDesc

@router.get("/sessions", response_model=SessionListResp, summary="Get Chat Session List")
async def api_get_session_list(
    header: HeaderInfo,
    session: DBSession,
    chat_session_dal: ChatSessionDAL,
    script_task_id: str = Query(..., description="脚本任务ID"),
    limit: int = Query(20, description="分页条数"),
    offset: int = Query(0, description="分页偏移"),
):
    async with session.begin():
        total = await chat_session_dal.count_by_script(
            user_id=header.user_id,
            script_task_id=script_task_id
        )
        sessions = await chat_session_dal.query_by_script(
            user_id=header.user_id,
            script_task_id=script_task_id,
            limit=limit,
            offset=offset
        )
        return SessionListResp(data=SessionListResp.SessionListDesc(
            sessions=[
                SessionInfo(
                    session_id=s.id,
                    title=s.title or "新会话",
                    created_at=s.created_at,
                    updated_at=s.updated_at,
                )
                for s in sessions
            ],
            total=total
        ))


# ========================= 获取会话消息记录 ===========================

class MessageInfo(BaseModel):
    message_id: str = Field(..., description="消息ID")
    role: str = Field(..., description="消息角色: user / assistant")
    content: str = Field(..., description="消息内容")
    created_at: datetime = Field(..., description="创建时间")

class MessageListResp(BaseResponse):
    class MessageListDesc(BaseModel):
        messages: list[MessageInfo] = Field([], description="消息列表")
        total: int = Field(..., description="消息总数")
    data: MessageListDesc

@router.get("/sessions/{session_id}/messages", response_model=MessageListResp, summary="Get Chat Session Messages")
async def api_get_session_messages(
    header: HeaderInfo,
    session: DBSession,
    chat_session_dal: ChatSessionDAL,
    chat_message_dal: ChatMessageDAL,
    session_id: str,
    limit: int = Query(100, description="分页条数"),
    offset: int = Query(0, description="分页偏移"),
):
    async with session.begin():
        # 校验会话归属
        chat_session = await chat_session_dal.query_by_id(session_id, header.user_id)
        if not chat_session:
            raise NotFoundException.NotFound(f"Session not found: {session_id}")

        total = await chat_message_dal.count_by_session(
            session_id=session_id,
            user_id=header.user_id
        )
        messages = await chat_message_dal.query_by_session(
            session_id=session_id,
            user_id=header.user_id,
            limit=limit,
            offset=offset
        )
        return MessageListResp(data=MessageListResp.MessageListDesc(
            messages=[
                MessageInfo(
                    message_id=m.id,
                    role=m.role,
                    content=m.content,
                    created_at=m.created_at,
                )
                for m in messages
            ],
            total=total
        ))


# ========================= 重命名会话 ===========================

class RenameSessionReq(BaseModel):
    title: str = Field(..., description="新会话标题", min_length=1, max_length=100)

@router.put("/sessions/{session_id}", response_model=BaseResponse, summary="Rename Chat Session")
async def api_rename_session(
    header: HeaderInfo,
    session: DBSession,
    chat_session_dal: ChatSessionDAL,
    session_id: str,
    req: RenameSessionReq,
):
    async with session.begin():
        success = await chat_session_dal.update_title(
            session_id=session_id,
            user_id=header.user_id,
            title=req.title
        )
    if not success:
        raise NotFoundException.NotFound(f"Session not found: {session_id}")
    return BaseResponse()


# ========================= 删除会话 ===========================

@router.delete("/sessions/{session_id}", response_model=BaseResponse, summary="Delete Chat Session")
async def api_delete_session(
    header: HeaderInfo,
    session: DBSession,
    chat_session_dal: ChatSessionDAL,
    session_id: str,
):
    async with session.begin():
        success = await chat_session_dal.delete(
            session_id=session_id,
            user_id=header.user_id
        )
    if not success:
        raise NotFoundException.NotFound(f"Session not found: {session_id}")
    return BaseResponse()


# ========================= 聊天接口（SSE 流式）===========================
def _build_system_prompt(
    subject: SUBJECT_TYPE,
    stage: STAGE_TYPE,
    script_content: str,
    current_teacher_handout: str,
    current_teacher_explanation: str,
) -> str:
    handout_section = f"""
## 学生提问时老师正在展示的讲义内容
<CURRENT_HANDOUT>
{current_teacher_handout}
</CURRENT_HANDOUT>""" if current_teacher_handout else ""

    explanation_section = f"""
## 学生提问时老师正在说的话
<CURRENT_EXPLANATION>
{current_teacher_explanation}
</CURRENT_EXPLANATION>""" if current_teacher_explanation else ""

    return f"""你是一位专业的{subject.description}学科教学助手，专门辅助{stage.description}阶段的学生理解题目讲解视频。

## 你的工作背景
学科：{subject.description}，学段：{stage.description}

## 视频完整脚本
<SCRIPT>
{script_content}
</SCRIPT>
{handout_section}
{explanation_section}

## 回答要求
1. 根据学生的问题，优先结合『学生提问时老师正在展示的讲义内容』和『老师正在说的话』进行解答，再展开到完整脚本。
2. 如果学生的问题与这道题目的讲解内容无关，必须友好地引导学生回到视频正题，例如：「这个问题超出了本次讲解的范围，让我们回到这道题目的解析上来～」。不要直接拒绝，要尊重并条理清晰地引导。
3. 回答语言与学生提问语言保持一致。
4. 答案要正确、简明、适合{stage.description}阶段学生的理解水平。
5. 确保思考和回答过程中的公式使用 latex 语法表示($...$包裹)"""


async def _get_script(session: DBSession, script_task_id: str, user_id: str) -> VideoScriptDesc:
    """从数据库获取脚本内容文本"""
    query = select(QuestionExplanationVideoGenScriptTask).where(
        QuestionExplanationVideoGenScriptTask.id == script_task_id,
        # TODO: 暂时放开权限
        # QuestionExplanationVideoGenScriptTask.user_id == user_id, 
        QuestionExplanationVideoGenScriptTask.activate == True
    )
    result = await session.execute(query)
    task = result.scalar_one_or_none()
    if not task:
        raise NotFoundException.NotFound(f"Script task not found: {script_task_id}")
    if not task.result:
        raise InvalidException.InvalidInput("Script task has no result yet")
    video_script = VideoScriptDesc.model_validate_json(task.result)
    return video_script

class ChatReq(BaseModel):
    script_task_id: str = Field(..., description="脚本任务ID")
    session_id: str | None = Field(None, description="会话ID，为空时自动创建新会话")
    message: str = Field(..., description="用户消息内容")
    current_teacher_handout: str = Field("", description="学生提问时老师正展示的讲义内容")
    current_teacher_explanation: str = Field("", description="学生提问时老师正在说的话")

class CHAT_RESP_CONTENT_TYPE(StrEnum):
    ERROR = "error"
    SESSION_CREATED = "session_created"
    THINKING = "thinking"
    DELTA = "delta"
    DONE = "done"

@router.post("/chat", summary="Chat with Script (SSE Stream)")
async def api_chat(
    header: HeaderInfo,
    session: DBSession,
    chat_session_dal: ChatSessionDAL,
    chat_message_dal: ChatMessageDAL,
    req: ChatReq,
):
    async def event_stream():
        session_id = req.session_id
        is_new_session = False

        try:
            # 1. 获取脚本内容（显式事务，避免 autobegin 导致后续 session.begin() 冲突）
            async with session.begin():
                script_content = await _get_script(session, req.script_task_id, header.user_id)

            # 2. 创建或校验会话
            async with session.begin():

                if not session_id:
                    # 新建会话，用消息前 50 字作为标题
                    title = req.message[:50]
                    chat_session = await chat_session_dal.create(
                        user_id=header.user_id,
                        script_task_id=req.script_task_id,
                        title=title
                    )
                    session_id = chat_session.id
                    is_new_session = True
                    logger.debug(f"[conversation] new session created: {session_id}")
                else:
                    # 校验会话归属
                    chat_session = await chat_session_dal.query_by_id(session_id, header.user_id)
                    if not chat_session:
                        yield f"data: {json.dumps({'type': CHAT_RESP_CONTENT_TYPE.ERROR, 'message': f'Session not found: {session_id}'})}\n\n"
                        return
                    if chat_session.script_task_id != req.script_task_id:
                        yield f"data: {json.dumps({'type': CHAT_RESP_CONTENT_TYPE.ERROR, 'message': 'Session does not belong to this script'})}\n\n"
                        return

                # 3. 保存用户消息
                await chat_message_dal.create(
                    session_id=session_id,
                    user_id=header.user_id,
                    role="user",
                    content=req.message
                )

            # 4. 如果是新会话，先推送 session_id
            if is_new_session:
                yield f"data: {json.dumps({'type': CHAT_RESP_CONTENT_TYPE.SESSION_CREATED, 'session_id': session_id})}\n\n"

            # 5. 获取历史上下文（根据配置 history_limit 进行限制，显式事务）
            agent_cfg = config.product.eduvideo.agent_chat
            history_limit_messages = agent_cfg.history_limit * 2
            async with session.begin():
                history_messages = await chat_message_dal.query_recent_for_context(
                    session_id=session_id,
                    user_id=header.user_id,
                    limit=history_limit_messages
                )

            # 6. 构建 LLM messages
            llm_messages = [
                {"role": "system", "content": _build_system_prompt(
                    subject=script_content.question_metadata.subject,
                    stage=script_content.question_metadata.stage,
                    script_content=script_content.scenes.model_dump_json(),
                    current_teacher_handout=req.current_teacher_handout,
                    current_teacher_explanation=req.current_teacher_explanation,
                )}
            ]
            for msg in history_messages:
                llm_messages.append({"role": msg.role, "content": msg.content})

            # 7. 调用 LLM（SSE 流式）
            client = AsyncOpenAI(
                base_url=agent_cfg.base_url,
                api_key=agent_cfg.api_key,
            )

            full_content = ""

            stream = await client.chat.completions.create(
                model=agent_cfg.model,
                messages=llm_messages,
                stream=True,
                stream_options={"include_usage": True}
            )

            async for chunk in stream:
                # 安全获取chunk.choices，如果不存在则跳过
                if not chunk or not hasattr(chunk, 'choices') or not chunk.choices:
                    continue
                choice = chunk.choices[0]
                if not choice or not hasattr(choice, 'delta'):
                    continue
                delta = choice.delta
                # 处理思考过程（reasoning_content）
                if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                    reasoning_content = delta.reasoning_content
                    yield f"data: {json.dumps({'type': CHAT_RESP_CONTENT_TYPE.THINKING, 'content': reasoning_content}, ensure_ascii=False)}\n\n"
                
                # 处理内容（content）
                if hasattr(delta, 'content') and delta.content:
                    content = delta.content
                    full_content += content
                    yield f"data: {json.dumps({'type': CHAT_RESP_CONTENT_TYPE.DELTA, 'content': content}, ensure_ascii=False)}\n\n"

            # 8. 保存 assistant 消息并更新 updated_at
            async with session.begin():
                await chat_message_dal.create(
                    session_id=session_id,
                    user_id=header.user_id,
                    role="assistant",
                    content=full_content
                )
                await chat_session_dal.touch(session_id, header.user_id)

            yield f"data: {json.dumps({'type': CHAT_RESP_CONTENT_TYPE.DONE, 'full_content': full_content}, ensure_ascii=False)}\n\n"
            logger.debug(f"[conversation] chat done, session_id={session_id}, reply_len={len(full_content)}")

        except Exception as e:
            logger.error(f"[conversation] chat error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': CHAT_RESP_CONTENT_TYPE.ERROR, 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )
