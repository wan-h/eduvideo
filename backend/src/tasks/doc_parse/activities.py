# -*- coding: utf-8 -*-
"""
@File    : activities.py
@Author  : 一力辉
"""

import os
import io
import json
import httpx
import asyncio
import tempfile
import zipfile
from temporalio import activity
from .utils import doc_download
from .schema import DocParseParams, DocParseResult
from src.middleware.storage.client import AsyncStorageClient
from src.server.dal.storage import StorageDAL
from src.schema import MODEL_PROVIDER
from src.tasks.schema import FileDesc
from src.tasks.utils import convert_doc_to_pdf, storage_object_name
from src.utils import config, logger

async def mineru_custom(
    url: str
) -> bytes:
    # 文档下载
    file: FileDesc = await doc_download(url)
    logger.debug(f"[doc_parse](mineru_custom) download file completed: {url}")

    file_bytes = file.content
    file_name = file.filename
    fname_lower = file_name.lower()
    mime_type = file.content_type or "application/octet-stream"

    if fname_lower.endswith(".doc") or fname_lower.endswith(".docx"):
        pdf_bytes = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda data=file.content, name=file.filename: convert_doc_to_pdf(data, name),
        )
        if not pdf_bytes:
            raise RuntimeError(
                f"[doc_parse] Failed to render Word file '{file.filename}' to PDF. "
                "LibreOffice conversion failed or soffice is not installed in the environment."
            )
        file_bytes = pdf_bytes
        file_name = f"{os.path.splitext(file_name)[0]}.pdf"
        mime_type = "application/pdf"
        logger.debug(f"[doc_parse](mineru_custom) rendered Word file to PDF for MinerU: {file_name}")

    files_req = {'files': (os.path.basename(file_name), io.BytesIO(file_bytes), mime_type)}
    payload = {
        'backend': 'vlm-auto-engine',
        'return_md': 'true',
        'return_images': 'true',
        'table_enable': 'true',
        'formula_enable': 'true',
        'return_middle_json': 'true',
        'return_model_output': 'true',
        'return_content_list': 'true',
        'response_format_zip': 'true'
    }
    async with httpx.AsyncClient(verify=False, timeout=None) as client:
        resp = await client.post(
            config.tasks.doc_parse.mineru.base_url,
            files=files_req,
            data=payload
        )
        resp.raise_for_status()
        logger.debug(f"[doc_parse](mineru_custom) doc struct parse completed: {url}")
        return resp.content

async def _mineru_create_task(
    client: httpx.AsyncClient,
    base: str,
    headers: dict,
    url: str,
) -> str:
    """通过文件 URL 创建解析任务，返回 task_id"""
    payload: dict = {"url": url}
    # model_version 为空时不传，使用 API 默认值（pipeline）
    if config.tasks.doc_parse.mineru.model:
        payload["model_version"] = config.tasks.doc_parse.mineru.model
    logger.debug(f"[doc_parse](mineru_api) create payload: {payload}")
    create_resp = await client.post(
        f"{base}/extract/task",
        headers=headers,
        json=payload,
    )
    create_resp.raise_for_status()
    create_body = create_resp.json()
    logger.debug(f"[doc_parse](mineru_api) create response: {create_body}")

    # 检查业务状态码
    if create_body.get("code") != 0:
        raise RuntimeError(
            f"MinerU create task failed: code={create_body.get('code')}, "
            f"msg={create_body.get('msg', 'unknown')}, "
            f"trace_id={create_body.get('trace_id', 'N/A')}"
        )

    data: dict = create_body.get("data", {})
    task_id: str = data.get("task_id", "")
    if not task_id:
        raise RuntimeError(f"MinerU create task returned no task_id: {create_body}")
    logger.debug(f"[doc_parse](mineru_api) task created: {task_id}")
    return task_id


async def _mineru_wait_task(
    client: httpx.AsyncClient,
    base: str,
    headers: dict,
    task_id: str,
) -> str:
    """轮询单文件任务直到完成，返回结果 zip 的下载地址"""
    while True:
        await asyncio.sleep(1)
        status_resp = await client.get(
            f"{base}/extract/task/{task_id}",
            headers=headers,
        )
        status_resp.raise_for_status()
        status_body = status_resp.json()
        status_data: dict = status_body.get("data", {})

        # 也检查状态查询的 code（如果 API 返回的话）
        if status_body.get("code") != 0:
            logger.warning(
                f"[doc_parse](mineru_api) status query returned error: "
                f"code={status_body.get('code')}, msg={status_body.get('msg')}"
            )

        state: str = status_data.get("state", "")
        logger.debug(f"[doc_parse](mineru_api) task {task_id} state={state}")

        if state == "done":
            zip_url: str = status_data.get("full_zip_url", "")
            if not zip_url:
                raise RuntimeError(
                    f"MinerU task {task_id} done but no full_zip_url: {status_body}"
                )
            logger.debug(f"[doc_parse](mineru_api) task {task_id} done, downloading zip: {zip_url}")
            return zip_url
        elif state in ("failed", "error"):
            raise RuntimeError(
                f"MinerU task {task_id} failed: {status_data.get('err_msg', state)}"
            )


async def _mineru_upload_file(
    client: httpx.AsyncClient,
    base: str,
    headers: dict,
    file_name: str,
    file_bytes: bytes,
) -> str:
    """申请上传链接并上传文件，返回 batch_id（上传完成后 MinerU 会自动提交解析任务）"""
    payload: dict = {"files": [{"name": file_name}]}
    if config.tasks.doc_parse.mineru.model:
        payload["model_version"] = config.tasks.doc_parse.mineru.model
    logger.debug(f"[doc_parse](mineru_api) apply upload payload: {payload}")
    create_resp = await client.post(
        f"{base}/file-urls/batch",
        headers=headers,
        json=payload,
    )
    create_resp.raise_for_status()
    create_body = create_resp.json()
    logger.debug(f"[doc_parse](mineru_api) apply upload response: {create_body}")

    if create_body.get("code") != 0:
        raise RuntimeError(
            f"MinerU apply upload url failed: code={create_body.get('code')}, "
            f"msg={create_body.get('msg', 'unknown')}, "
            f"trace_id={create_body.get('trace_id', 'N/A')}"
        )

    data: dict = create_body.get("data", {})
    batch_id: str = data.get("batch_id", "")
    file_urls: list[str] = data.get("file_urls") or []
    if not batch_id or not file_urls:
        raise RuntimeError(f"MinerU apply upload url returned no batch_id/file_urls: {create_body}")

    # 上传文件时不能设置 Content-Type，否则 OSS 签名校验失败
    upload_resp = await client.put(file_urls[0], content=file_bytes)
    upload_resp.raise_for_status()
    logger.debug(f"[doc_parse](mineru_api) upload completed, batch_id={batch_id}, file={file_name}")
    return batch_id


async def _mineru_wait_batch(
    client: httpx.AsyncClient,
    base: str,
    headers: dict,
    batch_id: str,
) -> str:
    """轮询批量任务直到完成，返回结果 zip 的下载地址"""
    while True:
        await asyncio.sleep(1)
        status_resp = await client.get(
            f"{base}/extract-results/batch/{batch_id}",
            headers=headers,
        )
        status_resp.raise_for_status()
        status_body = status_resp.json()

        if status_body.get("code") != 0:
            logger.warning(
                f"[doc_parse](mineru_api) batch status query returned error: "
                f"code={status_body.get('code')}, msg={status_body.get('msg')}"
            )

        results = status_body.get("data", {}).get("extract_result") or []
        if isinstance(results, dict):
            results = [results]
        if not results:
            logger.debug(f"[doc_parse](mineru_api) batch {batch_id} has no result yet")
            continue

        result: dict = results[0]
        state: str = result.get("state", "")
        logger.debug(f"[doc_parse](mineru_api) batch {batch_id} state={state}")

        if state == "done":
            zip_url: str = result.get("full_zip_url", "")
            if not zip_url:
                raise RuntimeError(
                    f"MinerU batch {batch_id} done but no full_zip_url: {status_body}"
                )
            logger.debug(f"[doc_parse](mineru_api) batch {batch_id} done, downloading zip: {zip_url}")
            return zip_url
        elif state in ("failed", "error"):
            raise RuntimeError(
                f"MinerU batch {batch_id} failed: {result.get('err_msg', state)}"
            )


async def mineru_api(
    url: str
) -> bytes:
    """
    调用 MinerU 在线 API（mineru.net/api/v4）解析文档。

    本服务对象存储内的文件走「本地文件批量上传解析」(/file-urls/batch)：
    后端直接从内网 MinIO 读取文件再上传，无需文件 URL 对外可达；
    外部 URL 走 /extract/task，由 MinerU 侧下载。
    """
    mineru_cfg = config.tasks.doc_parse.mineru
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {mineru_cfg.api_key}",
    }
    base = mineru_cfg.base_url.rstrip("/")

    async with httpx.AsyncClient(verify=False, timeout=None) as client:
        object_name = storage_object_name(url)
        if object_name:
            # 容器内无法通过 domain(localhost) 访问入口 nginx，改走内网 S3 读取
            file_info = await AsyncStorageClient.download_file(
                object_name=object_name,
                bucket=config.middleware.storage.bucket,
            )
            batch_id = await _mineru_upload_file(
                client,
                base,
                headers,
                os.path.basename(object_name),
                file_info.data,
            )
            zip_url = await _mineru_wait_batch(client, base, headers, batch_id)
        else:
            task_id = await _mineru_create_task(client, base, headers, url)
            zip_url = await _mineru_wait_task(client, base, headers, task_id)

        # 下载 zip（不带认证 header，公开 CDN URL）
        zip_resp = await client.get(zip_url)
        zip_resp.raise_for_status()
        logger.debug("[doc_parse](mineru_api) zip downloaded")
        return zip_resp.content

@activity.defn
async def doc_structure_parse(
    params: DocParseParams
) -> DocParseResult:
    provider = config.tasks.doc_parse.mineru.provider
    if provider== MODEL_PROVIDER.CUSTOM:
        zip_content = await mineru_custom(params.url)
    elif provider == MODEL_PROVIDER.MINERU:
        zip_content = await mineru_api(params.url)
    else:
        raise ValueError(f"Invalid doc parse provider: {provider}")

    with tempfile.TemporaryDirectory() as workspace:
        result_zip_file = os.path.join(workspace, 'result.zip')
        with open(result_zip_file, 'wb') as f:
            f.write(zip_content)

        with zipfile.ZipFile(result_zip_file, 'r') as zip_ref:
            zip_ref.extractall(workspace)
            first_entry = zip_ref.namelist()[0]
            folder_name = first_entry.rstrip('/') if first_entry.endswith('/') else os.path.dirname(first_entry)

        extract_dir = os.path.join(workspace, folder_name) if folder_name else workspace

        # -------- 查找各类文件 --------
        def _find_one(pattern_fn) -> str | None:
            """在 extract_dir 根目录下查找第一个满足条件的文件，返回绝对路径"""
            for name in os.listdir(extract_dir):
                full = os.path.join(extract_dir, name)
                if os.path.isfile(full) and pattern_fn(name):
                    return full
            return None

        md_path             = _find_one(lambda n: n.endswith('.md'))
        content_list_v1_path = _find_one(lambda n: n.endswith('_content_list.json') and not n.endswith('_content_list_v2.json'))
        content_list_v2_path = _find_one(lambda n: n.endswith('_content_list_v2.json'))
        model_output_path   = _find_one(lambda n: n.endswith('_model.json'))
        middle_json_path    = _find_one(lambda n: n.endswith('_middle.json') or n == 'layout.json')

        images_dir = os.path.join(extract_dir, 'images')
        image_files: list[tuple[str, str]] = []   # [(filename, abs_path), ...]
        if os.path.isdir(images_dir):
            for img_name in os.listdir(images_dir):
                img_path = os.path.join(images_dir, img_name)
                if os.path.isfile(img_path):
                    image_files.append((img_name, img_path))

        # -------- 推断页数 --------
        page_count = 1
        # 优先从 middle_json 的 pdf_info 数组长度获取（最可靠）
        if middle_json_path:
            try:
                with open(middle_json_path, "r", encoding="utf-8") as f:
                    mj = json.load(f)
                pdf_info = mj.get("pdf_info", [])
                if pdf_info:
                    page_count = len(pdf_info)
            except Exception as exc:
                logger.warning(f"[doc_parse] read middle_json for page_count failed: {exc}")

        # 回退：从 content_list_v1 取最大 page_idx + 1
        # if page_count == 1 and content_list_v1_path:
        #     try:
        #         with open(content_list_v1_path, "r", encoding="utf-8") as f:
        #             cl = json.load(f)
        #         max_page = -1
        #         for block in cl:
        #             if "page_idx" in block and block["page_idx"] is not None:
        #                 if block["page_idx"] > max_page:
        #                     max_page = block["page_idx"]
        #         if max_page >= 0:
        #             page_count = max_page + 1
        #     except Exception as exc:
        #         logger.warning(f"[doc_parse] read content_list for page_count failed: {exc}")

        logger.debug(f"[doc_parse](doc_structure_parse) page_count={page_count}")

        # -------- 并行上传 --------
        tag = f"{params.task_id}"

        upload_keys  = []
        upload_coros = []

        for key, path in [
            ("md",               md_path),
            ("content_list_v1",  content_list_v1_path),
            ("content_list_v2",  content_list_v2_path),
            ("model_output",     model_output_path),
            ("middle_json",      middle_json_path),
        ]:
            if path:
                upload_keys.append(key)
                upload_coros.append(StorageDAL.upload_file(
                    user_id=params.resquest_info.user_id,
                    file_name=os.path.basename(path),
                    file=path,
                    tag=tag,
                ))

        for img_name, img_path in image_files:
            upload_keys.append(f"image:{img_name}")
            upload_coros.append(StorageDAL.upload_file(
                user_id=params.resquest_info.user_id,
                file_name=img_name,
                file=img_path,
                tag=f"{tag}/images",
            ))

        urls: list[str] = await asyncio.gather(*upload_coros)
        url_map: dict[str, str] = dict(zip(upload_keys, urls))

        logger.debug(f"[doc_parse](doc_structure_parse) uploaded {len(urls)} files for task {params.task_id}")

        # -------- 填充结果 --------
        images_result = {
            img_name: url_map[f"image:{img_name}"]
            for img_name, _ in image_files
            if f"image:{img_name}" in url_map
        }

        return DocParseResult(
            source_url=params.url,
            md_content=url_map.get("md", ""),
            content_list_v1=url_map.get("content_list_v1", ""),
            content_list_v2=url_map.get("content_list_v2", ""),
            model_output=url_map.get("model_output", ""),
            middle_json=url_map.get("middle_json", ""),
            images=images_result,
            page_count=page_count,
        )