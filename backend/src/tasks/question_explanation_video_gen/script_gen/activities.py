# -*- coding: utf-8 -*-
"""
@File    : activities.py
@Author  : 一力辉
"""


import re
import json
import asyncio
from collections import namedtuple
import instructor
from instructor.processing.function_calls import _validate_model_from_json
from json_repair import repair_json
from openai import AsyncOpenAI
import httpx
from temporalio import activity
from src.utils import config, logger
from src.server.schema.eduvideo import SubtitleDesc, ExplanationContentDesc, \
    QuestionIntroSceneDesc, QuestionSolutionSceneDesc, QuestionKeyPointsSceneDesc
from src.tasks.utils import build_image_content_parts, replace_image_url, request_image_bytes, upload_file, download_file
from .prompts import Prompts
from .schema import QuestionParseResult, GenerateScriptParams, HandoutDesc, GenerateScriptResult, CreateQuestionExtractTaskParams, GenVideoScriptImageUploadReplaceParams
from .utils import split_text, fix_latex_in_text

_original_validate = _validate_model_from_json

def _safe_validate_model_from_json(cls, json_content, validation_context, strict):
    if isinstance(json_content, str):
        try:
            return _original_validate(cls, json_content, validation_context, strict)
        except Exception:
            # 用 json-repair 修复后再验证
            fixed = repair_json(json_content)
            return _original_validate(cls, fixed, validation_context, strict)
    return _original_validate(cls, json_content, validation_context, strict)

instructor.processing.function_calls._validate_model_from_json = _safe_validate_model_from_json

@activity.defn
async def gen_video_script_image_upload_replace(params: GenVideoScriptImageUploadReplaceParams) -> GenerateScriptResult:
    """视频脚本中的图片编辑/生成（上传s3）"""
    async def gen_image(user_id: str, task_id: str, image_id: str, prompt: str, image_url: str = "") -> str:
        if not prompt:
            return image_url

        client = AsyncOpenAI(
            base_url=config.tasks.question_explanation_video_gen_script.image_generator.base_url,
            api_key=config.tasks.question_explanation_video_gen_script.image_generator.api_key,
        )
        img_cfg = config.tasks.question_explanation_video_gen_script.image_generator

        image = None
        if image_url:
            # 有 image_url: 执行图片编辑 (images.edit)
            file_desc = await download_file(image_url)
            image = ("image.png", file_desc.content, "image/png")

        # 图片编辑模型可能不同于文生图模型（如 wan2.6-image / wan2.6-t2i）
        model = img_cfg.edit_model if image and img_cfg.edit_model else img_cfg.model

        # 无 image_url: 执行图片生成 (images.generate)
        image_bytes = await request_image_bytes(
            client, model=model, prompt=prompt, image=image, provider=img_cfg.provider
        )
        upload_result = await upload_file(user_id, task_id, f"{image_id}.png", image_bytes)
        return upload_result

    user_id = params.resquest_info.user_id
    task_id = params.task_id
    video_script = params.video_script
    language = params.language

    img_tag_pattern = r'<img\s+[^>]*>'

    # 收集所有需要处理的 content 及其关联信息
    ImageTask = namedtuple("ImageTask", ["content_path", "alt", "src", "img_id"])
    tasks_info: list[ImageTask] = []
    contents_to_process: dict[str, str] = {}  # path -> original content

    scenes = video_script.scenes

    def _extract_image_tasks(content: str, path_prefix: str):
        img_tags = re.findall(img_tag_pattern, content)
        has_tasks = False
        for tag in img_tags:
            alt_match = re.search(r'alt=["\']([^"\']+)["\']', tag)
            src_match = re.search(r'src=["\']([^"\']+)["\']', tag)
            alt = alt_match.group(1) if alt_match else ""
            src = src_match.group(1) if src_match else ""
            if alt or src:
                tasks_info.append(ImageTask(path_prefix, alt, src, f"script_img_{len(tasks_info)}"))
                has_tasks = True
        if has_tasks:
            contents_to_process[path_prefix] = content

    # 收集 question_solution scene 的 segments
    for i, segment in enumerate(scenes.question_solution.segments):
        _extract_image_tasks(segment.content, f"solution.segments[{i}]")

    # 收集 question_key_points scene 的 segments
    for i, segment in enumerate(scenes.question_key_points.segments):
        _extract_image_tasks(segment.content, f"keypoints.segments[{i}]")

    if not tasks_info:
        return video_script

    # 并行编辑所有图片
    gen_tasks = [
        gen_image(
            user_id,
            task_id,
            info.img_id,
            (info.alt + f"\n\n图片中的语言请使用**{language.description}**") if info.alt else "",
            image_url=info.src,
        )
        for info in tasks_info
    ]
    urls = await asyncio.gather(*gen_tasks)

    # 按 path 分组，记录每个 content 中所有 img 生成的 (alt, url) 列表
    path_results: dict[str, list[tuple[str, str]]] = {}
    for info, url in zip(tasks_info, urls):
        path_results.setdefault(info.content_path, []).append((info.alt, url))

    # 替换 content 中的 img 标签为 markdown 格式
    processed_contents: dict[str, str] = {}
    for path, original_content in contents_to_process.items():
        res_iter = iter(path_results[path])
        def _replace_img(match):
            alt, url = next(res_iter, ("", ""))
            if url:
                return f"![]({url})"
            return match.group(0)
        processed_contents[path] = re.sub(img_tag_pattern, _replace_img, original_content)

    # 更新 video_script
    new_scenes = scenes.model_copy()

    # 更新 solution segments
    if any(k.startswith("solution.segments") for k in processed_contents.keys()):
        new_segments = []
        for i, segment in enumerate(scenes.question_solution.segments):
            key = f"solution.segments[{i}]"
            if key in processed_contents:
                new_segments.append(segment.model_copy(update={"content": processed_contents[key]}))
            else:
                new_segments.append(segment)
        new_scenes.question_solution = scenes.question_solution.model_copy(update={"segments": new_segments})

    # 更新 key_points segments
    if any(k.startswith("keypoints.segments") for k in processed_contents.keys()):
        new_segments = []
        for i, segment in enumerate(scenes.question_key_points.segments):
            key = f"keypoints.segments[{i}]"
            if key in processed_contents:
                new_segments.append(segment.model_copy(update={"content": processed_contents[key]}))
            else:
                new_segments.append(segment)
        new_scenes.question_key_points = scenes.question_key_points.model_copy(update={"segments": new_segments})

    return video_script.model_copy(update={"scenes": new_scenes})


def question_to_scenes(
    question_parse_result: QuestionParseResult, 
    handout: HandoutDesc,
) -> tuple[QuestionIntroSceneDesc, QuestionSolutionSceneDesc, QuestionKeyPointsSceneDesc]:
    # 首页场景-描述问题
    question_intro_scene = QuestionIntroSceneDesc(
        stem=question_parse_result.question_content.stem,
        options=question_parse_result.question_content.options,
        subtitles=[SubtitleDesc(text=split_t) for split_t in split_text(handout.question_descrition)]
    )

    # 解题讲解页场景
    question_solution_scene = QuestionSolutionSceneDesc(
        segments=[
            ExplanationContentDesc(
                content=handout.question_solution_page.opening_part.content,
                subtitles=[SubtitleDesc(text=split_t) for split_t in split_text(handout.question_solution_page.opening_part.explain)]
            )
        ] + [
            ExplanationContentDesc(
                content=segment.content,
                title=segment.title,
                subtitles=[SubtitleDesc(text=split_t) for split_t in split_text(segment.explain)]
            ) for segment in handout.question_solution_page.main_parts
        ] + [
            ExplanationContentDesc(
                content=handout.question_solution_page.closing_part.content,
                subtitles=[SubtitleDesc(text=split_t) for split_t in split_text(handout.question_solution_page.closing_part.explain)]
            )
        ]
    )

    # 重难点讲解页
    question_key_points_scene = QuestionKeyPointsSceneDesc(
        segments=[
            ExplanationContentDesc(
                content=handout.question_key_points_page.opening_part.content,
                subtitles=[SubtitleDesc(text=split_t) for split_t in split_text(handout.question_key_points_page.opening_part.explain)]
            )
        ] + [
            ExplanationContentDesc(
                content=segment.content,
                subtitles=[SubtitleDesc(text=split_t) for split_t in split_text(segment.explain)]
            ) for segment in handout.question_key_points_page.main_parts
        ] + [
            ExplanationContentDesc(
                content=handout.question_key_points_page.closing_part.content,
                subtitles=[SubtitleDesc(text=split_t) for split_t in split_text(handout.question_key_points_page.closing_part.explain)]
            )
        ]
    )

    return (question_intro_scene, question_solution_scene, question_key_points_scene)


def fix_postprocess(video_script: GenerateScriptResult) -> GenerateScriptResult:
    video_script.scenes.question_introduction.stem = fix_latex_in_text(video_script.scenes.question_introduction.stem)
    video_script.scenes.question_introduction.options = [fix_latex_in_text(option) for option in video_script.scenes.question_introduction.options]
    
    for index in range(len(video_script.scenes.question_solution.segments)):
        video_script.scenes.question_solution.segments[index].content = fix_latex_in_text(video_script.scenes.question_solution.segments[index].content)
    
    for index in range(len(video_script.scenes.question_key_points.segments)):
        video_script.scenes.question_key_points.segments[index].content = fix_latex_in_text(video_script.scenes.question_key_points.segments[index].content)
    return video_script

@activity.defn
async def generate_script(params: GenerateScriptParams) -> GenerateScriptResult:
    """生成脚本"""
    question_content_images = []
    if params.question_text:
        question_content_images = re.findall(r'!\[.*?\]\((.*?)\)', params.question_text)
    # ============= 生成讲义 =============
    system_prompt = Prompts.get_generate_handout_prompt(
        subject=params.question_parse_result.subject, 
        stage=params.stage, 
        qtype=params.question_parse_result.question_type, 
        language=params.language,
    )
    all_images = params.question_images + question_content_images
    user_message = f"{params.question_text}\n\n答案如下：\n{params.question_solve_result.solution}"
    image_desc_message = ""
    question_images_count = len(params.question_images)
    question_content_images_count = len(question_content_images)
    if len(all_images) > 0:
        image_desc_message += f"我上传了{len(all_images)}张图片，请按顺序识别：\n"
        if question_images_count > 0:
            image_desc_message += f"前面{question_images_count}张图片为整个题干的图片\n"
        if question_content_images_count > 0:
            image_desc_message += f"后面{question_content_images_count}张为题目内容中使用到的图片\n"
        for index, url in enumerate(all_images):
            image_desc_message += f"第{index + 1}张图片src：{url}\n"

    user_message += "\n\n" + image_desc_message

    message_content = [
        {'type': 'text', 'text': user_message}
    ] + await build_image_content_parts(all_images)
    client = instructor.from_openai(
        AsyncOpenAI(
            base_url=config.tasks.question_explanation_video_gen_script.handout_generator.base_url,
            api_key=config.tasks.question_explanation_video_gen_script.handout_generator.api_key,
        ),
        mode=instructor.Mode.JSON
    )
    
    handout = await client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message_content}
        ],
        response_model=HandoutDesc,
        model=config.tasks.question_explanation_video_gen_script.handout_generator.model,
        max_retries=config.tasks.max_retries,
    )
    logger.debug(f"[question_explanation_video_gen](generate_handout) handout result: {handout}")

    # ============= 生成脚本 =============
    question_intro_scene, question_solution_scene, question_key_points_scene = question_to_scenes(
        question_parse_result=params.question_parse_result,
        handout=handout,
    )

    video_script = GenerateScriptResult(
        scenes=GenerateScriptResult.ScenesDesc(
            question_introduction=question_intro_scene,
            question_solution=question_solution_scene,
            question_key_points=question_key_points_scene,
        ),
        question_content=GenerateScriptResult.QuestionContent(
            stem=params.question_parse_result.question_content.stem,
            options=params.question_parse_result.question_content.options,
        ),
        question_metadata=GenerateScriptResult.QuestionMeta(
            title=params.question_parse_result.title,
            type=params.question_parse_result.question_type,
            level=params.question_solve_result.level,
            subject=params.question_parse_result.subject,
            language=params.language,
            voice=params.voice,
            stage=params.stage,
            knowledge_points=params.question_parse_result.knowledge_points,
        )
    )
    # ============= 修复后处理 =============
    video_script = fix_postprocess(video_script)
    return video_script


@activity.defn
async def create_questions_extract_task(params: CreateQuestionExtractTaskParams) -> None:
    url = f"{config.tasks.server_url}/api/{config.common.name}/eduvideo/v0/question_extract"
    headers = {
        "user-id": params.resquest_info.user_id
    }
    payload = {
        "user_id": params.resquest_info.user_id,
        "script_task_id": params.script_task_id,
        "urls": params.urls,
        "extract_result": params.extract_result
    }
    async with httpx.AsyncClient(verify=False, timeout=None) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        code = response.json()["code"]
        if code != 0:
            raise Exception(response.json()["message"])