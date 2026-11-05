# -*- coding: utf-8 -*-
"""
@File    : prompts.py
@Author  : 一力辉
"""

from src.schema import QUESTION_TYPE, STAGE_TYPE, LANGUAGE_TYPE, SUBJECT_TYPE

QUESTION_PARSE_PROMPT = """
# 角色
你是一名资深的教学专家

# 任务
请根据输入题目提取以下结构化信息：
* 标题
* 题目类型
* 科目
* 知识点
* 题目内容
  - 题干
  - 选项（选择题）

# 核心原则
## 题目标题
根据题目内容提取一个简短、准确、清晰的标题，要求突出题目的核心信息，长度控制在15个字内，例如“牛顿第一定律应用题”、“二次函数图像分析题”等
## 题目类型判断规则
1. 题目的类型分为：{qtype_enums}
2. 选择题是包含题干和若干个选项的题目，其余均视为问答题
3. 题目类型根据输入信息无法准确判断时都视为问答题(例如题目中包含了多个子问题，则视为问答题)
## 科目判断规则
1. 科目的类型分为：{subject_enums}
2. 科目根据输入信息无法准确判断时都视为其他
## 知识点提取规则
1. 知识点为题目涉及到的教学知识点，要求必须简短、准确、清晰，比如：牛顿第一定律、二次函数、氧化还原反应等
2. 提取知识点数量不超过{knowledge_point_limit}个
3. 严格使用 **{stage}** 阶段的知识点，不超纲
4. 知识点必须使用 **{language}** 输出
## 题目内容提取规则
1. 题干内容必须包含题目所有的要求，例如格式说明等
2. 题干内容必须来源于输入内容，不得编造！不得输出无关信息！
3. 不得删除和修改输入中markdown格式的图像语法，直接输出到对应的题干或则选项中
4. 选择题的选项放在options字段中(内容需要包含选项的序号，例如A、B、C、D)，问答题的options字段为空


# 输入
{question}

# 输出规则
* 规范文本的标点符号，消除文本中不合适的空格
* 化学相关的公式使用\\ce命令，如果输入原文为\\chemfig命令，则不需要更改
* 确保公式使用 latex 语法表示($...$包裹)
* 按照原则解析题目的结构化信息，不要解题！
* 输入中只有一道题目，如果检测有多个问题视为问答题，把所有信息放入题干，不要输出多个题目
"""

class Prompts:
    @staticmethod
    def add_response_schema(prompt: str, response_schema: str = ""):
        """添加输出格式描述"""
        if response_schema:
            prompt += f"\n\n# 输出格式\n{response_schema}"
        return prompt
    
    @staticmethod
    def get_question_parse_prompt(
        question: str, 
        stage: STAGE_TYPE, 
        language: LANGUAGE_TYPE, 
        knowledge_point_limit: int = 3,
        response_schema: str = ""
    ):
        """获取题目类型判断prompt"""
        prompt = QUESTION_PARSE_PROMPT.format(
            question=question, 
            language=language.description, 
            stage=stage.description,
            knowledge_point_limit=knowledge_point_limit,
            qtype_enums=QUESTION_TYPE.format_desc(),
            subject_enums=SUBJECT_TYPE.format_desc()
        )
        return Prompts.add_response_schema(prompt, response_schema)
