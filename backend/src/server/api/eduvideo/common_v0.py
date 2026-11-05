# -*- coding: utf-8 -*-
'''
@File    :   common.py
@Author  :   一力辉
'''

from pydantic import BaseModel, Field
from fastapi import APIRouter, Request
from src.server.depends import HeaderInfo
from src.server.schema.request import BaseResponse
from src.utils import config


router = APIRouter(prefix="/eduvideo/v0/common")



# ========================= 获取首页分享视频信息 ===========================
class ShareVideosResp(BaseResponse):
    class ShareVideoDesc(BaseModel):
        url: str = Field(..., description="视频链接")
        title: str = Field(..., description="视频标题")
    data: list[ShareVideoDesc] = Field(..., description="视频列表")

@router.get("/share_videos", response_model=ShareVideosResp, summary="Get Home Share Videos")
async def api_submit_video_script_task(
    header: HeaderInfo,
):  
    SHARE_VIDEO_TITLES_EN = {
        "数学奥数题讲解": "Math Olympiad Explanation",
        "生物选择题讲解": "Biology Multiple Choice Explanation",
        "化学选择题讲解": "Chemistry Organic Multiple Choice Explanation",
        "数学英语讲解": "Math & English Explanation",
        "物理解答题讲解": "Physics Question Explanation",
    }
    is_en = header.language == "en"
    return ShareVideosResp(
        code=200,
        message="success",
        data=[
            ShareVideosResp.ShareVideoDesc(
                url=s.url,
                title=SHARE_VIDEO_TITLES_EN.get(s.title, s.title) if is_en else s.title,
            )
            for s in config.product.eduvideo.share_video_samples
        ]
    )

# ========================= 获取首页的一些tips/placeholder/notification ===========================
class HomeDisplayInfoResp(BaseResponse):
    class DisplayInfoDesc(BaseModel):
        notifications: list[str] = Field([], description="通知列表")
        input_placeholder: str = Field("", description="输入框占位符")
        file_tips: list[str] = Field([], description="文件上传提示")
    data: DisplayInfoDesc = Field(..., description="首页展示信息")

@router.get("/home_display_info", response_model=HomeDisplayInfoResp, summary="Get Homepage Display Info")
async def api_get_home_display_info(
    header: HeaderInfo,
):  
    info = config.product.eduvideo.home_display_info
    if header.language == "en":
        notifications = [
            "Official version is live. Welcome!" if n == "正式版本已上线，欢迎试用！" else n
            for n in info.notifications
        ] if info.notifications else ["Official version is live. Welcome!"]

        input_placeholder = (
            "Describe the video topic, target audience, and key concepts you want to create..."
            if not info.input_placeholder or info.input_placeholder == "请输入你想生成的视频主题、适用对象、讲解重点..."
            else info.input_placeholder
        )

        FILE_TIPS_EN = {
            "支持文本、图片、PDF文件等": "Supports text, images, PDF files, etc.",
            "支持文本、图片、PDF及DOC文件等": "Supports text, images, PDF, and Word/DOC files, etc.",
            "解析讲义文件生成视频": "Parse handout file to generate video",
        }
        file_tips = [FILE_TIPS_EN.get(tip, tip) for tip in info.file_tips]
    else:
        notifications = info.notifications
        input_placeholder = info.input_placeholder
        file_tips = info.file_tips

    return HomeDisplayInfoResp(
        code=200,
        message="success",
        data=HomeDisplayInfoResp.DisplayInfoDesc(
            notifications=notifications,
            input_placeholder=input_placeholder,
            file_tips=file_tips
        )
    )
