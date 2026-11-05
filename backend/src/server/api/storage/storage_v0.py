# -*- coding: utf-8 -*-
'''
@File    :   storage_v0.py
@Author  :   一力辉
'''


import os
import mimetypes
from pydantic import BaseModel
from uuid import uuid4
from fastapi import APIRouter
from src.server.depends import HeaderInfo
from src.server.schema.request import BaseResponse
from src.server.dal.storage import StorageDAL


router = APIRouter(prefix="/storage/v0")

# ========================= 生成资源上传url签名 ===========================

class UploadPresignedUrlResp(BaseResponse):
    class UploadPresignedUrlDesc(BaseModel):
        upload_url: str
        public_url: str
        content_type: str
    data: UploadPresignedUrlDesc

@router.get("/upload/presigned_url", response_model=UploadPresignedUrlResp, summary="Generate upload presigned Url")
async def api_generate_upload_presigned_url(
    header: HeaderInfo, 
    file_name: str,
    content_type: str = "",
    tag: str = 'public'
):
    """
    生成资源上传url签名
    """
    # 获取原始文件后缀，用 UUID 构造新文件名避免冲突
    extension = os.path.splitext(file_name)[1]
    new_file_name = f"{uuid4()}{extension}"

    file_base_name = os.path.basename(file_name)
    # 猜 mime type
    if not content_type:
        content_type, _ = mimetypes.guess_type(file_base_name)
        if not content_type:
            content_type = "application/octet-stream"

    upload_url = await StorageDAL.generate_upload_presigned_url(
        user_id=header.user_id,
        file_name=new_file_name,
        tag=tag,
        content_type=content_type
    )
    return UploadPresignedUrlResp(
        data = UploadPresignedUrlResp.UploadPresignedUrlDesc(
            upload_url=upload_url,
            public_url=StorageDAL.get_path(
                user_id=header.user_id,
                file_name=new_file_name,
                tag=tag,
                include_domain=True
            ),
            content_type=content_type
        )
    )