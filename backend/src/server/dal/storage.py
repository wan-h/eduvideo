# -*- coding: utf-8 -*-
'''
@File    :   storage.py
@Author  :   一力辉
'''

import os
import asyncio
from src.schema import FileObjectInfo
from src.middleware.storage.client import AsyncStorageClient
from src.utils import config

SOTRAGE_COMMON_PREFIX = config.common.name

class StorageDAL():
    @staticmethod
    def get_path(
        user_id: str,
        file_name: str,
        tag: str = "public",
        include_domain: bool = False,
        include_prefix: bool = True
    ) -> str:
        return f"{config.middleware.storage.domain + '/' if include_domain else ''}{SOTRAGE_COMMON_PREFIX + '/' if include_prefix else ''}users/{user_id}/{tag}/{file_name}"

    @staticmethod
    async def upload_file(
        user_id: str,
        file_name: str,
        file: bytes | str,
        tag: str = "public",
        content_type: str = "",
        metadata: dict[str, str] = {},
    ):
        storage_path = StorageDAL.get_path(user_id, file_name, tag)

        file_object_info = FileObjectInfo(
            data=file,
            content_type=content_type,
            metadata=metadata
        )

        url = await AsyncStorageClient.upload_file(
            object_name=storage_path,
            object_info=file_object_info,
            bucket=config.middleware.storage.bucket
        )

        return url
    
    @staticmethod
    async def upload_folder(
        user_id: str,
        folder: str,
        tag: str = "public"
    ):
        tasks = []
        for root, dirs, files in os.walk(folder):
            for file in files:
                file_path = os.path.join(root, file)
                relative_path = os.path.dirname(os.path.relpath(file_path, folder))
                new_tag = f"{tag}/{relative_path}" if relative_path else tag
                tasks.append(StorageDAL.upload_file(
                    user_id=user_id,
                    file_name=file,
                    file=file_path,
                    tag=new_tag
                ))

        await asyncio.gather(*tasks)

    @staticmethod
    async def download_file(
        user_id: str, 
        file_name: str,
        tag: str = "public"
    ) -> FileObjectInfo:
        storage_path = StorageDAL.get_path(user_id, file_name, tag)
        file_object_info = await AsyncStorageClient.download_file(
            object_name=storage_path,
            bucket=config.middleware.storage.bucket
        )
        return file_object_info
    
    @staticmethod
    async def generate_upload_presigned_url(
        user_id: str,
        file_name: str,
        tag: str = "public",
        content_type: str = "application/octet-stream",
        expire: int = 3600 # 单位s
    ) -> str:
        storage_path = StorageDAL.get_path(user_id, file_name, tag)
        url = await AsyncStorageClient.generate_upload_presigned_url(
            object_name=storage_path,
            bucket=config.middleware.storage.bucket,
            content_type=content_type,
            expire=expire
        )
        return url
    
    @staticmethod
    async def check_file_exist(
        user_id: str,
        file_name: str,
        tag: str = "public"
    ) -> bool:
        storage_path = StorageDAL.get_path(user_id, file_name, tag)
        return await AsyncStorageClient.check_file_exist(
            object_name=storage_path,
            bucket=config.middleware.storage.bucket
        )

