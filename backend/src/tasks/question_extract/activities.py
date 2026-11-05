# -*- coding: utf-8 -*-
"""
@File    : activities.py
@Author  : 一力辉
"""

import io
import json
import uuid
import asyncio
from typing import Any
import instructor
from PIL import Image
from pdf2image import convert_from_bytes
from temporalio import activity
from openai import AsyncOpenAI
from .prompts import SYSTEM_PROMPT
from .schema import QuestionExtractFromDocParams, QuestionExtractFromDocResult, QuestionInfo, LLMQuestionGroup, LLMExtractResult
from src.tasks.utils import convert_doc_to_pdf, download_file, upload_file, replace_image_url
from src.tasks.schema import FileDesc
from src.utils import config, logger
 
 
 
 
 
# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _assign_ids(content_list: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """为 content_list 的每个 item 原地添加唯一 id 字段，返回带 id 的列表副本。"""
    return [{**item, "id": f"b{i}"} for i, item in enumerate(content_list)]


def _serialize_for_llm(blocks: list[dict[str, Any]]) -> str:
    """将带 id 的 block 列表序列化为紧凑文本，供 LLM 阅读。"""
    lines: list[str] = []
    current_page: int | None = None

    for b in blocks:
        bid: str = b["id"]
        btype: str = b["type"]
        page: int | None = b.get("page_idx")

        if page is not None and page != current_page:
            lines.append(f"=== 第{page + 1}页 ===")
            current_page = page

        if btype == "text":
            lines.append(f"[{bid}] text: {b.get('text', '')!r}")
        elif btype == "list":
            preview = " / ".join(str(it) for it in b.get("list_items", []))
            lines.append(f"[{bid}] list({b.get('sub_type', '')}): [{preview}]")
        elif btype == "image":
            parts: list[str] = []
            if sub := b.get("sub_type"):
                parts.append(f"sub_type={sub}")
            if cap := ", ".join(b.get("image_caption", [])):
                parts.append(f"caption={cap!r}")
            if desc := b.get("content"):
                parts.append(f"desc={desc!r}")
            lines.append(f"[{bid}] image: ({', '.join(parts) or '图片'})")
        elif btype == "table":
            cap = ", ".join(b.get("table_caption", []))
            lines.append(f"[{bid}] table: caption={cap!r} body={b.get('table_body', '')!r}")
        elif btype == "equation":
            lines.append(f"[{bid}] equation: {b.get('text', '')!r}")
        elif btype == "chart":
            cap = ", ".join(b.get("chart_caption", []))
            lines.append(f"[{bid}] chart: caption={cap!r}")
        elif btype == "code":
            cap = ", ".join(b.get("code_caption", []))
            lines.append(f"[{bid}] code: caption={cap!r}")
        else:
            lines.append(f"[{bid}] {btype}: {b.get('text', '')!r}")

    return "\n".join(lines)


def _block_to_markdown(block: dict[str, Any]) -> str:
    """将单个 block 转换为 markdown 片段。"""
    btype: str = block.get("type", "")
    if btype == "text":
        return block.get("text", "")
    elif btype == "list":
        return "\n".join(str(it) for it in block.get("list_items", []))
    elif btype == "image":
        img_path: str = block.get("img_path", "")
        caption = " ".join(block.get("image_caption", []))
        return f"![{caption}]({img_path})"
    elif btype == "table":
        parts: list[str] = []
        if body := block.get("table_body"):
            parts.append(body)
        if img := block.get("img_path"):
            caption = " ".join(block.get("table_caption", []))
            parts.append(f"![{caption}]({img})")
        return "\n\n".join(parts)
    elif btype == "equation":
        return block.get("text", "")
    elif btype == "chart":
        img_path = block.get("img_path", "")
        caption = " ".join(block.get("chart_caption", []))
        return f"![{caption}]({img_path})"
    elif btype == "code":
        return block.get("code_body", "")
    else:
        return block.get("text", "")


def _merge_bbox(bboxes: list[list[float]]) -> list[float] | None:
    valid = [b for b in bboxes if b and len(b) == 4]
    if not valid:
        return None
    return [
        min(b[0] for b in valid),
        min(b[1] for b in valid),
        max(b[2] for b in valid),
        max(b[3] for b in valid),
    ]


def _crop_from_page(page_img: Image.Image, bbox: list[float]) -> Image.Image:
    """根据千分比 bbox=[x0,y0,x1,y1] 裁剪页面图片（留少量 padding）。"""
    PAD = 4  # px
    w, h = page_img.size
    x0 = max(0, int(bbox[0] / 1000 * w) - PAD)
    y0 = max(0, int(bbox[1] / 1000 * h) - PAD)
    x1 = min(w, int(bbox[2] / 1000 * w) + PAD)
    y1 = min(h, int(bbox[3] / 1000 * h) + PAD)
    return page_img.crop((x0, y0, x1, y1))


def _stack_images_vertically(crops: list[Image.Image]) -> Image.Image:
    """将多张截图左对齐、右侧白色填充到等宽后垂直拼接成一张图。"""
    if len(crops) == 1:
        return crops[0]
    target_w = max(img.width for img in crops)
    total_h = sum(img.height for img in crops)
    combined = Image.new("RGB", (target_w, total_h), color=(255, 255, 255))
    y_offset = 0
    for img in crops:
        combined.paste(img, (0, y_offset))   # 左对齐，右侧自动保持白色背景
        y_offset += img.height
    return combined


async def _postprocess(
    groups: list[LLMQuestionGroup],
    id_to_block: dict[str, dict[str, Any]],
    images: dict[str, str],
    page_images: dict[int, Image.Image],
    user_id: str,
    task_id: str,
) -> list[QuestionInfo]:
    """后处理：还原内容、计算 bbox、截图上传并填充 image 字段。"""
    questions: list[QuestionInfo] = []
    for group in groups:
        blocks: list[dict[str, Any]] = [
            id_to_block[bid] for bid in group.block_ids if bid in id_to_block
        ]

        content = "\n\n".join(
            p for p in (_block_to_markdown(b) for b in blocks) if p.strip()
        )

        # 按页收集 bbox
        pages_bboxes: dict[int, list[list[float]]] = {}
        for b in blocks:
            page: int | None = b.get("page_idx")
            bbox: list[float] | None = b.get("bbox")
            if bbox and page is not None:
                pages_bboxes.setdefault(page, []).append(bbox)

        bbox_result: list[float] | dict[str, list[float] | None] | None
        if not pages_bboxes:
            bbox_result = None
        elif len(pages_bboxes) == 1:
            bbox_result = _merge_bbox(next(iter(pages_bboxes.values())))
        else:
            bbox_result = {
                str(page): _merge_bbox(bboxes)
                for page, bboxes in sorted(pages_bboxes.items())
            }

        # 截图：对每一页裁剪合并 bbox 区域，然后垂直拼接
        image_url = ""
        crops: list[Image.Image] = []
        for page_idx, bboxes in sorted(pages_bboxes.items()):
            merged = _merge_bbox(bboxes)
            if merged and page_idx in page_images:
                crops.append(_crop_from_page(page_images[page_idx], merged))

        if crops:
            try:
                combined = _stack_images_vertically(crops)
                buf = io.BytesIO()
                combined.save(buf, format="PNG")
                png_bytes = buf.getvalue()
                file_name = f"question_{uuid.uuid4().hex}.png"
                image_url = await upload_file(
                    user_id=user_id,
                    task_id=task_id,
                    file_name=file_name,
                    file_data=png_bytes,
                    content_type="image/png",
                )
            except Exception as exc:
                logger.warning(f"[question_extract](_postprocess) screenshot upload failed: {exc}")

        questions.append(QuestionInfo(
            image=image_url,
            question_number=group.question_number,
            question_type=group.question_type,
            content=replace_image_url(content, images),
            bbox=bbox_result,
        ))
    return questions



# ---------------------------------------------------------------------------
# Activity
# ---------------------------------------------------------------------------

@activity.defn
async def question_extract_from_doc(
    params: QuestionExtractFromDocParams,
) -> QuestionExtractFromDocResult:
    # 1. 并发下载所有 content_list 文件，同时下载原始文件（PDF 或图片）以生成页面截图
    async def _maybe_download(url: str) -> FileDesc | None:
        return await download_file(url) if url else None

    content_list_tasks = [download_file(doc_res.content_list_v1) for doc_res in params.doc_parse_results]
    source_tasks = [_maybe_download(url) for url in params.source_urls]
    content_files, source_files = await asyncio.gather(
        asyncio.gather(*content_list_tasks),
        asyncio.gather(*source_tasks),
    )

    # 2. 汇总内容、图片，合并并调整 page_idx；同时构建全局 page_idx -> PIL.Image 映射
    merged_content_list: list[dict[str, Any]] = []
    merged_images: dict[str, str] = {}
    page_images: dict[int, Image.Image] = {}   # global page_idx -> PIL Image
    current_page_offset = 0

    for i, (doc_res, content_file, source_file) in enumerate(zip(params.doc_parse_results, content_files, source_files)):
        content_list: list[dict[str, Any]] = json.loads(content_file.content)

        for block in content_list:
            if "page_idx" in block and block["page_idx"] is not None:
                block["page_idx"] += current_page_offset

        merged_content_list.extend(content_list)
        if doc_res.images:
            merged_images.update(doc_res.images)

        # 将原始文件转成每页 PIL Image，并按全局 page_idx 存储
        # 支持 PDF、Word 文档（DOC/DOCX）和常见图片格式（JPEG/PNG/WEBP 等）
        src_url = params.source_urls[i] if i < len(params.source_urls) else ""
        if source_file is not None and source_file.content:
            ct = (source_file.content_type or "").lower()
            fname = (source_file.filename or "").lower()
            data = source_file.content
            is_pdf = "pdf" in ct or fname.endswith(".pdf") or data.startswith(b"%PDF")
            is_word = (
                "word" in ct
                or "msword" in ct
                or "officedocument" in ct
                or fname.endswith(".doc")
                or fname.endswith(".docx")
                or data.startswith(b"\xd0\xcf\x11\xe0")
            )

            pil_pages: list[Image.Image] = []
            if is_pdf:
                try:
                    pil_pages = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda data=source_file.content: convert_from_bytes(data, dpi=200),
                    )
                except Exception as exc:
                    logger.warning(f"[question_extract] convert_from_bytes failed for PDF {src_url}: {exc}")
            elif is_word:
                pdf_bytes = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda data=source_file.content, name=source_file.filename: convert_doc_to_pdf(data, name),
                )
                if not pdf_bytes:
                    raise RuntimeError(
                        f"[question_extract] Failed to convert Word file '{source_file.filename}' to PDF. "
                        "LibreOffice conversion failed or soffice is not installed in the environment."
                    )
                try:
                    pil_pages = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda data=pdf_bytes: convert_from_bytes(data, dpi=200),
                    )
                except Exception as exc:
                    logger.warning(f"[question_extract] convert_from_bytes failed for converted Word PDF {src_url}: {exc}")
            else:
                # 单张图片，视为单页
                try:
                    pil_img = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda data=source_file.content: Image.open(io.BytesIO(data)).convert("RGB"),
                    )
                    pil_pages = [pil_img]
                except Exception as exc:
                    logger.warning(f"[question_extract] Image.open failed for image file {source_file.filename}: {exc}")

            logger.debug(f"[question_extract](question_extract_from_doc) {len(pil_pages)} pages from {src_url}")
            for local_idx, pil_img in enumerate(pil_pages):
                global_idx = local_idx + current_page_offset
                page_images[global_idx] = pil_img

        # 用实际渲染页数累加 offset，避免空白页导致多文件间 page_idx 错位
        actual_page_count = len(page_images) - current_page_offset
        current_page_offset += max(actual_page_count, 1)

    # 打 ID
    blocks = _assign_ids(merged_content_list)
    id_to_block = {b["id"]: b for b in blocks}
    logger.debug(f"[question_extract](question_extract_from_doc) {len(blocks)} blocks, {len(page_images)} pages")

    # 3. 序列化
    serialized = _serialize_for_llm(blocks)

    # 4. 调用 LLM
    extractor_cfg = config.tasks.question_extract.extractor
    client = instructor.from_openai(
        AsyncOpenAI(
            base_url=extractor_cfg.base_url,
            api_key=extractor_cfg.api_key,
        ),
        mode=instructor.Mode.JSON
    )
    resp: LLMExtractResult = await client.chat.completions.create(
        model=extractor_cfg.model,
        response_model=LLMExtractResult,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "以下是文档的内容块列表，请按要求分析并输出题目分组 JSON。\n\n"
                    + serialized
                ),
            },
        ],
        max_retries=config.tasks.max_retries
    )
    logger.debug(
        f"[question_extract](question_extract_from_doc) extract result: {resp}"
    )

    # 5. 后处理：截图 + 上传
    questions = await _postprocess(
        groups=resp.groups,
        id_to_block=id_to_block,
        images=merged_images,
        page_images=page_images,
        user_id=params.resquest_info.user_id,
        task_id=params.task_id,
    )
    logger.debug(f"[question_extract](question_extract_from_doc) extracted {len(questions)} questions")

    return QuestionExtractFromDocResult(questions=questions, total=len(questions))
