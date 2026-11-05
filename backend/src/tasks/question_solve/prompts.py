# -*- coding: utf-8 -*-
"""
@File    : prompts.py
@Author  : 一力辉
"""

from src.schema import LANGUAGE_TYPE, STAGE_TYPE, SUBJECT_TYPE, QUESTION_DIFFICULTY_LEVEL_TYPE

QUESTION_SOLVE_PROMPT = """
# 角色
你是一名资深的{subject}解题专家

# 任务
请给出用户问题难度等级以及解答内容(解答过程和最终答案)

# 核心原则
1. 题目的难度等级分为：{question_level_enums}
2. 解答过程限定在 **{stage}** 阶段，不得使用超纲解法
3. 解题过程中如有需要使用公式、化学式、物理定理推导等，确保公式使用 latex 语法表示($...$包裹)
4. 严格确保解答过程 and 最终答案的正确性

# 输出规则
* 请使用 **{language}** 输出
* 直接输出解答过程和最终答案，不要输出其他信息
"""

class Prompts:
    @staticmethod
    def add_response_schema(prompt: str, response_schema: str = ""):
        """添加输出格式描述"""
        if response_schema:
            prompt += f"\n\n# 输出格式\n{response_schema}"
        return prompt

    @staticmethod
    def get_question_solve_prompt(
        subject: SUBJECT_TYPE, 
        stage: STAGE_TYPE, 
        language: LANGUAGE_TYPE, 
        response_schema: str = ""
    ):
        """获取选择题结构化输出prompt"""
        prompt = QUESTION_SOLVE_PROMPT.format(
            subject=subject.description, 
            stage=stage.description, 
            language=language.description,
            question_level_enums=QUESTION_DIFFICULTY_LEVEL_TYPE.format_desc()
        )
        return Prompts.add_response_schema(prompt, response_schema)
