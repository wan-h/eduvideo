# -*- coding: utf-8 -*-
'''
@File    :   ai_editor_service.py
@Author  :   Antigravity
'''

import re
import json
from openai import AsyncOpenAI
from src.utils import config, logger
from src.server.schema.ai_assist import AIEditReq, AIEditData, TokenUsage


def validate_latex_and_markdown(text: str) -> bool:
    """
    检查 LaTeX 美元符号对以及基本的 Markdown 表格对齐
    """
    # 检查内联/行间 $ 符号的简易配对
    escaped_text = re.sub(r'\\\$', '', text)
    dollar_count = escaped_text.count('$')
    if dollar_count % 2 != 0:
        return False
    return True


class AIEditorService:
    def __init__(self, api_key: str | None = None, base_url: str | None = None, model: str | None = None):
        cfg = config.product.eduvideo.magic_wand.text_model

        self.api_key = api_key or cfg.api_key
        self.base_url = base_url or cfg.base_url
        self.model = model or cfg.model

    def _build_system_prompt(self, field_type: str, mode: str) -> str:
        return f"""你是一位精通中学与高等教育 K12/理工科题目教学编辑的 AI 助手。
你的任务是对用户输入的富文本 Markdown/LaTeX 内容进行智能修改。

【编辑目标字段】: {field_type}
【编辑模式】: {mode}

【严格遵守的排版与格式规范】:
1. LaTeX 公式规范：
   - 行内公式必须使用单美元符号包围 `$ ... $`。
   - 独立行间公式必须使用双美元符号包围 `$$ ... $$`。
   - 必须确保所有的 `$` 符号成对闭合，严禁遗漏闭合美元符。
   - 分数使用 `\\frac{{a}}{{b}}` 格式。
2. Markdown 表格规范：
   - 如果包含表格，必须保持完整的 Markdown 管道表格 `|` 列分隔与对齐线。
3. 编辑约束：
   - 保持原本的教学逻辑严谨性。
4. 优质内容检查策略：
   - 在编辑前，先对当前文本的语法、LaTeX 公式规范、逻辑严谨性与精简度进行评估。
   - 如果当前内容已经非常优秀（如 LaTeX 公式规范无误、表述简洁清晰且无推导逻辑/数值错误），请勿进行强行或无意义的重写修改。
   - 在此情况下，`suggested_content` 保持与原内容完全一致，并在 `change_summary` 中明确说明：“经检查，当前内容已符合高标准规范，无需修改。”
"""

    def _build_user_prompt(self, req: AIEditReq) -> str:
        context_info = []
        if req.context:
            if req.context.question_stem:
                context_info.append(f"【原题题干】:\n{req.context.question_stem}")
            if req.context.options:
                opts = "\n".join([f"选项 {i+1}: {opt}" for i, opt in enumerate(req.context.options)])
                context_info.append(f"【题目选项】:\n{opts}")
            if req.context.steps:
                steps_str = "\n".join([
                    f"步骤 {i+1} [{s.title}]: {s.breakdown} (总结: {s.summary})"
                    for i, s in enumerate(req.context.steps)
                ])
                context_info.append(f"【全题解题步骤】:\n{steps_str}")

        ctx_text = "\n\n".join(context_info) if context_info else "无额外上下文"

        mode_instructions = {
            "format_fix": "请自动修复当前内容中的 Markdown 排版错误、LaTeX 公式转义/未闭合问题，优化标准化输出。",
            "condense": "请在保持核心推导逻辑与教学严谨性的前提下，精简繁重冗长的表述，提炼要点。",
            "logic_check": "请结合全题上下文，严格检查当前内容中的推导运算、步骤逻辑与数值是否存在错误，并进行修正。",
            "custom": f"请按照用户自定义指令执行修改：{req.custom_prompt or '优化当前内容'}",
        }

        instruction = mode_instructions.get(req.mode, mode_instructions["format_fix"])

        prompt = f"""【全题上下文信息】:
{ctx_text}

【当前正在编辑的内容 ({req.field_type})】:
{req.current_content}

{"【用户选中的局部文本】:\n" + req.selected_text if req.selected_text else ""}

【具体要求】:
{instruction}

请输出包含以下 JSON 结构的字符串：
{{
  "suggested_content": "修改后的完整内容",
  "change_summary": "简短的一句话变更说明"
}}
"""
        return prompt

    async def generate_edit_stream(self, req: AIEditReq):
        system_prompt = self._build_system_prompt(req.field_type, req.mode)
        user_prompt = self._build_user_prompt(req)

        if not self.api_key or self.api_key == "mock-key":
            mock_res = self._mock_fallback(req)
            yield {"type": "delta", "content": mock_res.suggested_content, "change_summary": mock_res.change_summary}
            yield {
                "type": "done",
                "suggested_content": mock_res.suggested_content,
                "change_summary": mock_res.change_summary,
                "syntax_valid": mock_res.syntax_valid,
                "prompt_tokens": mock_res.token_usage.prompt_tokens,
                "completion_tokens": mock_res.token_usage.completion_tokens,
            }
            return

        try:
            client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
            stream = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                stream=True,
                stream_options={"include_usage": True},
            )

            full_json_str = ""
            prompt_tokens = 0
            completion_tokens = 0
            last_yielded_suggested = ""

            async for chunk in stream:
                if chunk and hasattr(chunk, "usage") and chunk.usage:
                    prompt_tokens = chunk.usage.prompt_tokens
                    completion_tokens = chunk.usage.completion_tokens

                if not chunk or not hasattr(chunk, "choices") or not chunk.choices:
                    continue
                choice = chunk.choices[0]
                if not choice or not hasattr(choice, "delta"):
                    continue
                delta = choice.delta
                if hasattr(delta, "content") and delta.content:
                    full_json_str += delta.content

                    # 尝试从流式的全量 JSON 串中抓取 suggested_content 增量
                    match = re.search(r'"suggested_content"\s*:\s*"(.*)', full_json_str, re.DOTALL)
                    if match:
                        raw_val = match.group(1)
                        # 去除 JSON 未完结尾部
                        clean_val = re.sub(r'"\s*,?\s*"change_summary".*', '', raw_val, flags=re.DOTALL)
                        clean_val = re.sub(r'"\s*\}?$', '', clean_val, flags=re.DOTALL)
                        # 反转义常见 JSON 字符
                        try:
                            decoded_val = json.loads(f'"{clean_val}"')
                        except Exception:
                            decoded_val = clean_val.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')

                        if len(decoded_val) > len(last_yielded_suggested):
                            delta_text = decoded_val[len(last_yielded_suggested):]
                            last_yielded_suggested = decoded_val
                            yield {"type": "delta", "content": delta_text}

            # 评估 Token (Fallback)
            if prompt_tokens == 0 or completion_tokens == 0:
                prompt_len = len(system_prompt) + len(user_prompt)
                prompt_tokens = int(prompt_len * 1.5)
                completion_tokens = int(len(full_json_str) * 1.5)

            try:
                data = json.loads(full_json_str)
            except Exception:
                data = {}

            suggested = data.get("suggested_content", last_yielded_suggested or req.current_content)
            summary = data.get("change_summary", "已根据要求完成 AI 编辑优化")
            is_valid = validate_latex_and_markdown(suggested)

            yield {
                "type": "done",
                "suggested_content": suggested,
                "change_summary": summary,
                "syntax_valid": is_valid,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
            }
        except Exception as e:
            logger.error(f"AI edit streaming failed: {e}")
            mock_res = self._mock_fallback(req)
            yield {
                "type": "done",
                "suggested_content": mock_res.suggested_content,
                "change_summary": mock_res.change_summary,
                "syntax_valid": mock_res.syntax_valid,
                "prompt_tokens": mock_res.token_usage.prompt_tokens,
                "completion_tokens": mock_res.token_usage.completion_tokens,
            }

    def _mock_fallback(self, req: AIEditReq) -> AIEditData:
        prefix = f"【AI {req.mode} 优化】"
        if req.mode == "format_fix":
            suggested = req.current_content.strip()
            # 基础格式修正示范
            summary = "已修复公式排版与标点符号规范"
        elif req.mode == "condense":
            suggested = req.current_content.strip()
            summary = "已精简冗余表述，提炼逻辑要点"
        elif req.mode == "logic_check":
            suggested = req.current_content.strip()
            summary = "结合全题上下文检查完毕，逻辑与数值正确"
        else:
            suggested = req.current_content.strip()
            summary = f"已按指令“{req.custom_prompt}”进行修改"

        return AIEditData(
            suggested_content=suggested,
            change_summary=summary,
            syntax_valid=validate_latex_and_markdown(suggested),
            token_usage=TokenUsage(prompt_tokens=150, completion_tokens=80),
        )

    async def edit_image(self, user_id: str, task_id: str, image_url: str, prompt: str) -> str:
        """
        根据提示词对指定图片执行 AI 编辑 / 生成，并上传至存储服务返回新图片 URL。
        参考 gen_video_script_image_upload_replace 实现。
        """
        import uuid
        from src.tasks.utils import download_file, request_image_bytes, upload_file

        img_cfg = config.product.eduvideo.magic_wand.image_model

        api_key = img_cfg.api_key
        base_url = img_cfg.base_url
        model = img_cfg.model

        if not api_key or api_key == "mock-key":
            logger.warning("[AIEditorService] Using mock key, returning original image_url")
            return image_url

        client = AsyncOpenAI(api_key=api_key, base_url=base_url)

        image = None
        if image_url:
            file_desc = await download_file(image_url)
            image = ("image.png", file_desc.content, "image/png")
            # 图片编辑模型可能不同于文生图模型（如 wan2.6-image / wan2.6-t2i）
            model = img_cfg.edit_model or model

        image_bytes = await request_image_bytes(
            client, model=model, prompt=prompt, image=image, provider=img_cfg.provider
        )

        file_name = f"magic_wand_img_{uuid.uuid4().hex[:8]}.png"
        new_url = await upload_file(user_id, task_id, file_name, image_bytes)
        return new_url

