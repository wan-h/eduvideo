# -*- coding: utf-8 -*-
'''
@File    :   ai_assist.py
@Author  :   Antigravity
'''

from typing import Optional, List
from pydantic import BaseModel, Field
from src.server.schema.request import BaseResponse


class StepContext(BaseModel):
    title: str = Field("", description="步骤标题")
    breakdown: str = Field("", description="步骤推导内容")
    summary: str = Field("", description="步骤总结")


class FullContext(BaseModel):
    question_stem: str = Field("", description="原题题干")
    options: List[str] = Field(default_factory=list, description="选项列表")
    steps: List[StepContext] = Field(default_factory=list, description="解题步骤列表")
    active_step_index: Optional[int] = Field(None, description="当前活动步骤索引")


class AIEditReq(BaseModel):
    script_task_id: Optional[str] = Field("", description="关联的脚本任务ID")
    field_type: str = Field(..., description="字段类型: question_stem | step_title | step_breakdown | step_summary | option")
    mode: str = Field("format_fix", description="编辑模式: format_fix | condense | logic_check | custom")
    custom_prompt: Optional[str] = Field("", description="自定义编辑指令")
    current_content: str = Field(..., description="当前富文本 Markdown 内容")
    selected_text: Optional[str] = Field("", description="用户选中的文本（可选）")
    context: Optional[FullContext] = Field(default_factory=FullContext, description="整道题目的上下文")


class TokenUsage(BaseModel):
    prompt_tokens: int = Field(0, description="Prompt 消耗 Token")
    completion_tokens: int = Field(0, description="Completion 消耗 Token")


class AIEditData(BaseModel):
    suggested_content: str = Field(..., description="推荐修改后的 Markdown 内容")
    change_summary: str = Field("", description="变更说明")
    syntax_valid: bool = Field(True, description="语法校验是否通过")
    token_usage: TokenUsage = Field(default_factory=TokenUsage, description="Token 消耗明细")


class AIEditResp(BaseResponse):
    data: Optional[AIEditData] = Field(None, description="AI 编辑结果")


class AIImageEditReq(BaseModel):
    script_task_id: Optional[str] = Field("", description="关联的脚本任务ID")
    image_url: str = Field(..., description="要编辑的原图 URL")
    prompt: str = Field(..., description="编辑提示词/修改指令")


class AIImageEditData(BaseModel):
    new_image_url: str = Field(..., description="编辑生成后的新图片 URL")
    change_summary: str = Field("AI 图片编辑完成", description="变更说明")


class AIImageEditResp(BaseResponse):
    data: Optional[AIImageEditData] = Field(None, description="AI 图片编辑结果")

