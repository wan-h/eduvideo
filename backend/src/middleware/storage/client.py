# -*- coding: utf-8 -*-
"""
@File    : client.py
@Author  : 一力辉
"""

import os
import mimetypes
import aioboto3
from botocore.config import Config
from tenacity import retry, stop_after_attempt, wait_exponential
from io import BytesIO
from src.schema import FileObjectInfo
from src.utils import config, get_file_content_mime_type


# 明确配置使用 SigV4
s3_config = Config(
    signature_version='s3v4'
)

s3_session = aioboto3.Session(
    aws_access_key_id=config.middleware.storage.user, 
    aws_secret_access_key=config.middleware.storage.passwd
)

class AsyncStorageClient():
    @staticmethod
    @retry(
        stop=stop_after_attempt(3),  # 最多重试3次（含首次请求）
        wait=wait_exponential(multiplier=1, min=4, max=10),  # 指数退避等待
        reraise=True,  # 重试结束后抛出原始异常
    )
    async def upload_file(
        object_name: str, 
        object_info: FileObjectInfo,
        bucket: str
    ) -> str:
        extra = {
            "Metadata": object_info.metadata
        }
        if object_info.content_type:
            extra.update({"ContentType": object_info.content_type})

        # 如果传入的是文件路径，使用 aiofile 异步读取文件
        if isinstance(object_info.data, str):
            file_path = object_info.data
            # 如果没有指定 content_type，根据文件扩展名猜测
            if not object_info.content_type:
                mime_type, _ = mimetypes.guess_type(file_path)
                if mime_type:
                    extra.update({"ContentType": mime_type})

            async with s3_session.client(
                "s3",
                endpoint_url=config.middleware.storage.host,
                # verify=False,
            ) as s3:
                await s3.upload_file(file_path, bucket, object_name, ExtraArgs=extra)
                return f"{config.middleware.storage.domain}/{object_name}"
        else:
            async with s3_session.client(
                "s3",
                endpoint_url=config.middleware.storage.host,
                # verify=False,
            ) as s3:
                mime_type = get_file_content_mime_type(object_info.data)
                if mime_type:
                    extra.update({"ContentType": mime_type})
                await s3.upload_fileobj(BytesIO(object_info.data), bucket, object_name, ExtraArgs=extra)
                return f"{config.middleware.storage.domain}/{object_name}"

    @staticmethod
    @retry(
        stop=stop_after_attempt(3),  # 最多重试3次（含首次请求）
        wait=wait_exponential(multiplier=1, min=4, max=10),  # 指数退避等待
        reraise=True,  # 重试结束后抛出原始异常
    )
    async def download_file(
        object_name: str,
        bucket: str
    ) -> FileObjectInfo:
        async with s3_session.client(
            "s3",
            endpoint_url=config.middleware.storage.host,
            # verify=False,
        ) as s3:
            response = await s3.get_object(Bucket=bucket, Key=object_name)
            file_bytes = await response["Body"].read()
            # 使用 head_object 获取对象信息
            response = await s3.head_object(
                Bucket=bucket,
                Key=object_name
            )
            metadata = response.get('Metadata', {})
            content_type = response.get('ContentType', get_file_content_mime_type(file_bytes))
            return FileObjectInfo(
                data=file_bytes,
                metadata=metadata,
                content_type=content_type
            )
    
    @staticmethod
    @retry(
        stop=stop_after_attempt(3),  # 最多重试3次（含首次请求）
        wait=wait_exponential(multiplier=1, min=4, max=10),  # 指数退避等待
        reraise=True,  # 重试结束后抛出原始异常
    )
    async def get_file_metadata(
        object_name: str,
        bucket: str
    ) -> dict[str, str]:
         async with s3_session.client(
            "s3",
            endpoint_url=config.middleware.storage.host,
            # verify=False,
        ) as s3:
            # 使用 head_object 获取对象信息
            response = await s3.head_object(
                Bucket=bucket,
                Key=object_name
            )
            metadata = response.get('Metadata', {})
            return metadata
    
    @staticmethod
    @retry(
        stop=stop_after_attempt(3),  # 最多重试3次（含首次请求）
        wait=wait_exponential(multiplier=1, min=4, max=10),  # 指数退避等待
        reraise=True,  # 重试结束后抛出原始异常
    )
    async def generate_upload_presigned_url(
        object_name: str,
        bucket: str,
        content_type: str,
        expire: int = 3600, # 单位s
    ) -> str:
        """
        生成预签名URL
        """
        # 预签名URL由浏览器直接访问，必须使用浏览器可达的地址(public_host)，
        # 容器内网地址(host)在容器部署时浏览器无法解析
        async with s3_session.client(
            "s3",
            endpoint_url=config.middleware.storage.public_host or config.middleware.storage.host,
            config=s3_config
        ) as s3:
            url = await s3.generate_presigned_url(
                ClientMethod='put_object',
                Params={
                    "Bucket": bucket,
                    "Key": object_name,
                    "ContentType": content_type,
                },
                ExpiresIn=expire,
            )
            return url
    
    @staticmethod
    async def check_file_exist(
        object_name: str,
        bucket: str
    ) -> bool:
        async with s3_session.client(
            "s3",
            endpoint_url=config.middleware.storage.host,
        ) as s3:
            try:
                await s3.head_object(Bucket=bucket, Key=object_name)
                return True
            except:
                return False

    
    @staticmethod
    @retry(
        stop=stop_after_attempt(3),  # 最多重试3次（含首次请求）
        wait=wait_exponential(multiplier=1, min=4, max=10),  # 指数退避等待
        reraise=True,  # 重试结束后抛出原始异常
    )
    async def delete_folder(
        folder_name: str,
        bucket: str
    ) -> None:
        async with s3_session.client(
            "s3",
            endpoint_url=config.middleware.storage.host,
        ) as s3:
            # 先列出文件夹下的所有对象
            objects_to_delete = []
            paginator = s3.get_paginator('list_objects_v2')
            async for page in paginator.paginate(Bucket=bucket, Prefix=folder_name):
                if 'Contents' in page:
                    objects_to_delete.extend(
                        [{'Key': obj['Key']} for obj in page['Contents']]
                    )
            
            # 批量删除所有对象
            if objects_to_delete:
                # S3 每次最多删除 1000 个对象，需要分批处理
                for i in range(0, len(objects_to_delete), 1000):
                    batch = objects_to_delete[i:i + 1000]
                    await s3.delete_objects(
                        Bucket=bucket,
                        Delete={'Objects': batch}
                    )