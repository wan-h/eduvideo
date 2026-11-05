# -*- coding: utf-8 -*-
'''
@File    :   eduvideo.py
@Author  :   一力辉
'''


import uuid
from datetime import datetime
from src.schema import TASK_STATUS
from src.middleware.database.engine import Base
from sqlalchemy import Column, String, Boolean, Text, DateTime, Integer
from sqlalchemy.dialects.postgresql import JSONB

class VideoSynthesisRecord(Base):
    __tablename__ = 'eduvideo_video_synthesis_record'
    id = Column(String(36), primary_key=True, nullable=False, default=lambda: str(uuid.uuid4()), doc="任务ID")
    user_id = Column(String, index=True, nullable=False, doc="用户ID")
    script_task_id = Column(String, index=True, nullable=False, doc="脚本任务ID")
    synthesis_task_id = Column(String, unique=True, index=True, nullable=False, doc="合成任务ID")
    activate = Column(Boolean, nullable=False, default=True, doc="是否激活")
    script_md5 = Column(String(32), index=True, nullable=True, doc="视频脚本的MD5值")

class VideoSynthesisTemplate(Base):
    __tablename__ = 'eduvideo_video_export_template'
    id = Column(String(36), primary_key=True, nullable=False, default=lambda: str(uuid.uuid4()), doc="模板ID")
    user_id = Column(String, index=True, nullable=False, doc="用户ID")
    name = Column(String, nullable=False, doc="模板名称")
    template = Column(JSONB, nullable=False, doc="VideoExportDesc JSON 数据")
    activate = Column(Boolean, nullable=False, default=True, doc="是否激活")


class WorkspaceFolder(Base):
    __tablename__ = 'eduvideo_workspace_folder'
    id = Column(String(36), primary_key=True, nullable=False, default=lambda: str(uuid.uuid4()), doc="文件夹ID")
    user_id = Column(String, index=True, nullable=False, doc="用户ID")
    name = Column(String, nullable=False, doc="文件夹名称")
    parent_id = Column(String, index=True, default="", doc="父文件夹ID")
    activate = Column(Boolean, nullable=False, default=True, doc="是否激活")


class WorkspaceScriptRelation(Base):
    __tablename__ = 'eduvideo_workspace_script_relation'
    id = Column(String(36), primary_key=True, nullable=False, default=lambda: str(uuid.uuid4()), doc="关联ID")
    user_id = Column(String, index=True, nullable=False, doc="用户ID")
    script_task_id = Column(String, unique=True, index=True, nullable=False, doc="脚本任务ID")
    folder_id = Column(String, index=True, default="", doc="文件夹ID，为空表示在根目录")
    activate = Column(Boolean, nullable=False, default=True, doc="是否激活")


class VoiceCloneRecord(Base):
    __tablename__ = 'eduvideo_voice_clone_record'
    id = Column(String(36), primary_key=True, nullable=False, default=lambda: str(uuid.uuid4()), doc="记录ID")
    user_id = Column(String, index=True, nullable=False, doc="用户ID")
    name = Column(String, nullable=False, doc="音色名字")
    voice_id = Column(String, unique=True, index=True, nullable=False, doc="音色唯一标识 (spk_id)")
    provider = Column(String, nullable=False, doc="模型提供方 (e.g. ALIYUN)")
    prompt_text = Column(String, nullable=False, doc="克隆时使用的文本内容")
    audio = Column(String, nullable=False, doc="上传的音频存储地址")
    activate = Column(Boolean, nullable=False, default=True, doc="是否激活")


class ChatSession(Base):
    __tablename__ = 'eduvideo_chat_session'
    id = Column(String(36), primary_key=True, nullable=False, default=lambda: str(uuid.uuid4()), doc="会话ID")
    user_id = Column(String, index=True, nullable=False, doc="用户ID")
    script_task_id = Column(String, index=True, nullable=False, doc="关联的脚本任务ID")
    title = Column(String(100), nullable=False, default="", doc="会话标题（取第一条用户消息截断）")
    activate = Column(Boolean, nullable=False, default=True, doc="是否激活")
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now, doc="最后更新时间")


class ChatMessage(Base):
    __tablename__ = 'eduvideo_chat_message'
    id = Column(String(36), primary_key=True, nullable=False, default=lambda: str(uuid.uuid4()), doc="消息ID")
    session_id = Column(String(36), index=True, nullable=False, doc="会话ID")
    user_id = Column(String, index=True, nullable=False, doc="用户ID（冗余，便于权限过滤）")
    role = Column(String(16), nullable=False, doc="消息角色: user / assistant")
    content = Column(Text, nullable=False, doc="消息内容")
    activate = Column(Boolean, nullable=False, default=True, doc="是否激活")

class ScriptQuestionsExtractConfirm(Base):
    __tablename__ = 'eduvideo_doc_questions_extract_confirm'
    id = Column(String(36), primary_key=True, nullable=False, default=lambda: str(uuid.uuid4()), doc="记录ID")
    user_id = Column(String, index=True, nullable=False, doc="用户ID")
    script_task_id = Column(String, index=True, unique=True, nullable=False, doc="脚本生成任务ID")
    extract_question_task_id = Column(String, index=True, unique=True, nullable=False, doc="提取题目任务ID")
    status = Column(Integer, nullable=False, default=TASK_STATUS.WAIT_CONFIRM, doc="状态")
    activate = Column(Boolean, nullable=False, default=True, doc="是否激活")

class EdtTtsRecord(Base):
    __tablename__ = 'eduvideo_edt_tts_record'
    id = Column(String(36), primary_key=True, nullable=False, default=lambda: str(uuid.uuid4()), doc="记录ID")
    user_id = Column(String, index=True, nullable=False, doc="用户ID")
    script_task_id = Column(String, index=True, nullable=False, doc="脚本任务ID")
    tts_task_id = Column(String, unique=True, index=True, nullable=False, doc="TTS任务ID")
    activate = Column(Boolean, nullable=False, default=True, doc="是否激活")