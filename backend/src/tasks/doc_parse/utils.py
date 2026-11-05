# -*- coding: utf-8 -*-
"""
@File    : utils.py
@Author  : 一力辉
"""

import io
import base64
import base64
from pdf2image import convert_from_bytes
from src.tasks.schema import FileDesc
from src.tasks.utils import download_file


# async def doc_download(url: str) -> list[FileDesc]:
#     files: list[FileDesc] = []
#     # 获取文件数据
#     file = await download_file(url)

#     if file.content_type == 'application/pdf' or file.filename.endswith('.pdf'):
#         pdf_images = convert_from_bytes(file.content)
#         for i, pdf_image in enumerate(pdf_images):
#             image_bytes_io = io.BytesIO()
#             pdf_image.save(image_bytes_io, format="png")
#             files.append(
#                 FileDesc(
#                     content=image_bytes_io.getvalue(),
#                     s3_url=url,
#                     filename=f"{file.filename}_page_{i}.png",
#                     content_type="image/png",
#                 )
#             )
#     else:
#         files.append(
#             FileDesc(
#                 content=file.content,
#                 s3_url=url,
#                 filename=file.filename,
#                 content_type=file.content_type,
#             )
#         )
#     return files

async def doc_download(url: str) -> FileDesc:
    # 获取文件数据
    file = await download_file(url)

    return FileDesc(
                content=file.content,
                s3_url=url,
                filename=file.filename,
                content_type=file.content_type,
            )