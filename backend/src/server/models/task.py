# -*- coding: utf-8 -*-
'''
@File    :   task.py
@Author  :   一力辉
'''


import uuid
from src.middleware.database.engine import Base
from sqlalchemy import Column, String, Boolean, Integer, Float
from sqlalchemy.dialects.postgresql import JSONB
from src.schema import TASK_STATUS

class BaseTask(Base):
    __abstract__ = True
    id = Column(String(36), primary_key=True, nullable=False, default=lambda: str(uuid.uuid4()), doc="任务ID")
    user_id = Column(String, index=True, nullable=False, doc="用户ID")
    workflow_id = Column(String, index=True, nullable=False, doc="工作流ID")
    request = Column(String, nullable=False, doc="任务请求输入")
    progress = Column(Integer, nullable=False, default=0, doc="任务进度（0-100）")
    result = Column(String, nullable=True, default="", doc="任务结果")
    message = Column(String, nullable=True, default="", doc="任务消息")
    status = Column(Integer, nullable=False, default=TASK_STATUS.PENDING, doc="状态")
    activate = Column(Boolean, nullable=False, default=True, doc="是否激活")

class DocParseTask(BaseTask):
    __tablename__ = 'doc_parse_task'

class ReadableTtsTask(BaseTask):
    __tablename__ = 'readable_tts_task'

class QuestionExtractTask(BaseTask):
    __tablename__ = 'question_extract_task'

class QuestionExplanationVideoGenScriptTask(BaseTask):
    __tablename__ = 'question_explanation_video_gen_script_task'

class QuestionExplanationVideoGenSynthesisTask(BaseTask):
    __tablename__ = 'question_explanation_video_gen_synthesis_task'

class QuestionExplanationVideoGenScriptSynthesisTask(BaseTask):
    __tablename__ = 'question_explanation_video_gen_script_synthesis_task'

class QuestionSolveTask(BaseTask):
    __tablename__ = 'question_solve_task'

class QuestionParseTask(BaseTask):
    __tablename__ = 'question_parse_task'