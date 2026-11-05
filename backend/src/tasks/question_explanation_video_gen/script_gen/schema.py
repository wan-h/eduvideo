# -*- coding: utf-8 -*-
'''
@File    :   protocol.py
@Author  :   一力辉
'''


from pydantic import BaseModel, Field
from src.schema import LANGUAGE_TYPE, STAGE_TYPE, RequestInfo
from src.tasks.schema import BaseWorkflowParams
from src.server.schema.eduvideo import VideoScriptDesc
from src.tasks.question_solve.schema import QuestionSolveResult
from src.tasks.question_parse.schema import QuestionParseResult

class GenVideoScriptImageUploadReplaceParams(BaseModel):
    resquest_info: RequestInfo
    task_id: str
    language: LANGUAGE_TYPE
    video_script: VideoScriptDesc

class SegmentContentDesc(BaseModel):
    content: str = Field(..., description="片段的板书内容")
    explain: str = Field(..., description="针对该片段板书的讲解")

class SegmentStepContentDesc(SegmentContentDesc):
    title: str = Field(..., description="解题步骤的标题")

class HandoutDesc(BaseModel):
    class QuestionSolutionSceneDesc(BaseModel):
        opening_part: SegmentContentDesc | None = Field(None, description="开场部分")
        main_parts: list[SegmentStepContentDesc] = Field([], description="主体部分（题目的解题步骤讲解）")
        closing_part: SegmentContentDesc | None = Field(None, description="结束部分")
    
    class QuestionKeyPointsSceneDesc(BaseModel):
        opening_part: SegmentContentDesc | None = Field(None, description="开场部分")
        main_parts: list[SegmentContentDesc] = Field([], description="主体部分（重难点讲解）")
        closing_part: SegmentContentDesc | None = Field(None, description="结束部分")

    question_descrition: str = Field(..., description="讲义的开场白，描述题目")
    question_solution_page: QuestionSolutionSceneDesc = Field(..., description="解题讲解场景")
    question_key_points_page: QuestionKeyPointsSceneDesc = Field(..., description="重难点讲解场景")

class GenerateScriptParams(BaseModel):
    stage: STAGE_TYPE
    voice: str
    language: LANGUAGE_TYPE
    question_text: str
    question_images: list[str]
    question_solve_result: QuestionSolveResult
    question_parse_result: QuestionParseResult

class GenerateScriptResult(VideoScriptDesc):
    ...

class ScriptGenReq(BaseModel):
    text: str = Field(..., description="用户的文本输入")
    urls: list[str] = Field([], description="用户上传的图片列表")
    voice: str = Field("", description="用户的声音偏好")
    stage: STAGE_TYPE
    language: LANGUAGE_TYPE

class ScriptGenWorkflowParams(ScriptGenReq, BaseWorkflowParams):
    resquest_info: RequestInfo
    task_id: str
    script: str = Field("", description="缓存脚本")
    question_extract: bool = Field(True, description="是否需要提取问题")
    

class ScriptGenWorkflowResult(GenerateScriptResult):
    ...

class CreateQuestionExtractTaskParams(BaseModel):
    resquest_info: RequestInfo
    script_task_id: str
    urls: list[str]
    extract_result: dict