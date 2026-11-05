# -*- coding: utf-8 -*-
"""对象存储初始化（compose 一次性容器）。

幂等: bucket 不存在则创建，随后确保匿名只读策略存在。
配置全部取自环境变量，与 compose 中 minio 的端口 / 凭据保持同一来源，
避免"改了 STORAGE_API_PORT 但初始化还打旧端口"这类错配。
"""

import json
import os
import sys

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

ENDPOINT = os.environ["STORAGE_HOST"]
USER = os.environ["STORAGE_USER"]
PASSWORD = os.environ["STORAGE_PASSWORD"]
BUCKET = os.environ["STORAGE_BUCKET"]


def read_only_policy(bucket: str) -> str:
    # 匿名只读: 前端播放、渲染器下载媒体都依赖它
    return json.dumps(
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "AllowAnonymousRead",
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket}/*"],
                }
            ],
        }
    )


def main() -> int:
    s3 = boto3.client(
        "s3",
        endpoint_url=ENDPOINT,
        aws_access_key_id=USER,
        aws_secret_access_key=PASSWORD,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )

    try:
        s3.head_bucket(Bucket=BUCKET)
        print(f"[storage-init] bucket 已存在: {BUCKET}")
    except ClientError:
        s3.create_bucket(Bucket=BUCKET)
        print(f"[storage-init] bucket 已创建: {BUCKET}")

    s3.put_bucket_policy(Bucket=BUCKET, Policy=read_only_policy(BUCKET))
    print(f"[storage-init] 匿名只读策略已设置: {BUCKET}")
    return 0


if __name__ == "__main__":
    sys.exit(main())