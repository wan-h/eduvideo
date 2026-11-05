# -*- coding: utf-8 -*-
'''
@File    :   eduvideo.py
@Author  :   一力辉
'''

from enum import StrEnum
from src.schema import QUESTION_TYPE, QUESTION_DIFFICULTY_LEVEL_TYPE, SUBJECT_TYPE, VIDEO_RESOLUTION_TYPE, LANGUAGE_TYPE, STAGE_TYPE
from src.utils import count_text_length
from src.tasks.question_extract.schema import QuestionExtractFromDocResult
from src.tasks.question_parse.schema import QuestionParseResult
from src.tasks.question_solve.schema import QuestionSolveResult
from pydantic import BaseModel, Field


class SubtitleDesc(BaseModel):
    text: str = Field(description="字幕内容")
    audio: str | None = Field(None, description="字幕对应的音频")
    duration: int = Field(0, description="音频持续时间ms")

class ExplanationContentDesc(BaseModel):
    title: str = Field("", description="讲解标题")
    content: str = Field(..., description="讲解内容")
    subtitles: list[SubtitleDesc] = Field([], description="字幕内容")

class QuestionIntroSceneDesc(BaseModel):
    stem: str = Field(..., description="开场内容")
    options: list[str] = Field([], description="选择题选项")
    subtitles: list[SubtitleDesc] = Field([], description="字幕内容")
    
class QuestionSolutionSceneDesc(BaseModel):
    segments: list[ExplanationContentDesc] = Field([], description="解题讲解分段内容")

class QuestionKeyPointsSceneDesc(BaseModel):
    segments: list[ExplanationContentDesc] = Field([], description="解题讲解分段内容")

class VideoScriptDesc(BaseModel):
    
    class QuestionMeta(BaseModel):
        title: str = Field(..., description="题目标题")
        type: QUESTION_TYPE = Field(..., description="题目类型")
        level: QUESTION_DIFFICULTY_LEVEL_TYPE = Field(..., description="题目难度")
        subject: SUBJECT_TYPE = Field(..., description="题目学科")
        stage: STAGE_TYPE = Field(..., description="题目学段")
        language: LANGUAGE_TYPE = Field(..., description="题目语言")
        voice: str = Field(..., description="讲解音色")
        knowledge_points: list[str] = Field(..., description="题目涉及到的知识点列表")
        video_synthesis_template_id: str | None = Field(None, description="视频合成模板id")
    
    class QuestionContent(BaseModel):
        stem: str = Field(..., description="题干内容")
        options: list[str] = Field([], description="选择题的选项列表，问答题为空列表")
    
    class ScenesDesc(BaseModel):
        question_introduction: QuestionIntroSceneDesc = Field(..., description="题目介绍场景")
        question_solution: QuestionSolutionSceneDesc = Field(..., description="解题讲解场景")
        question_key_points: QuestionKeyPointsSceneDesc = Field(..., description="重难点讲解场景")
    
    class StepsDesc(BaseModel):
        question_extract: QuestionExtractFromDocResult | None = Field(None, description="题目抽取步骤")
        question_parse: QuestionParseResult | None = Field(None, description="题目解析步骤")
        question_solve: QuestionSolveResult | None = Field(None, description="题目解答步骤")

    question_content: QuestionContent | None = Field(None, description="视频脚本题目内容")
    question_metadata: QuestionMeta | None = Field(None, description="视频脚本题目元数据")
    scenes: ScenesDesc | None = Field(None, description="视频脚本场景内容")
    steps: StepsDesc | None = Field(None, description="视频脚本步骤记录")

    @property
    def total_audio_duration(self) -> int:
        """计算所有音频时长之和（单位：毫秒）"""
        total = 0
        if not self.scenes:
            return total
        # 1. 题目介绍场景
        if self.scenes.question_introduction and self.scenes.question_introduction.subtitles:
            total += sum(s.duration for s in self.scenes.question_introduction.subtitles if s.duration)
        # 2. 解题讲解场景
        if self.scenes.question_solution and self.scenes.question_solution.segments:
            for segment in self.scenes.question_solution.segments:
                if segment.subtitles:
                    total += sum(s.duration for s in segment.subtitles if s.duration)
        # 3. 重难点讲解场景
        if self.scenes.question_key_points and self.scenes.question_key_points.segments:
            for segment in self.scenes.question_key_points.segments:
                if segment.subtitles:
                    total += sum(s.duration for s in segment.subtitles if s.duration)
        return total

    @property
    def total_audio_character_length(self) -> int:
        """计算所有字幕文本的字符长度之和：中文按字计、英文按单词计。"""
        total = 0
        if not self.scenes:
            return total
        # 1. 题目介绍场景
        if self.scenes.question_introduction and self.scenes.question_introduction.subtitles:
            total += sum(count_text_length(s.text) for s in self.scenes.question_introduction.subtitles)
        # 2. 解题讲解场景
        if self.scenes.question_solution and self.scenes.question_solution.segments:
            for segment in self.scenes.question_solution.segments:
                if segment.subtitles:
                    total += sum(count_text_length(s.text) for s in segment.subtitles)
        # 3. 重难点讲解场景
        if self.scenes.question_key_points and self.scenes.question_key_points.segments:
            for segment in self.scenes.question_key_points.segments:
                if segment.subtitles:
                    total += sum(count_text_length(s.text) for s in segment.subtitles)
        return total

class VideoExportDesc(BaseModel):
    resolution: VIDEO_RESOLUTION_TYPE = Field(VIDEO_RESOLUTION_TYPE.P_1080, description="视频分辨率")
    background: str = Field('default', description="视频背景")
    opening_film: str = Field('', description="开场视频")
    closing_film: str = Field('', description="结尾视频")
    watermark: str = Field('', description="水印")
    fps: int = Field(24, description="视频帧率")
    speed: float = Field(1.0, description="视频倍速")
    page_layout: str = Field('question_split', description="页面布局：question_split(题目左分屏), full_screen(全屏讲解)")
