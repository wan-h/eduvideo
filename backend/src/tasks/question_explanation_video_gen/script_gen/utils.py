# -*- coding: utf-8 -*-
"""
@File    : utils.py
@Author  : 一力辉
"""


import re
import json
import pysbd
import unicodedata


def split_text(text: str) -> list[str]:
    def is_all_punctuation(text: str):
        s = re.sub(r"\s+", "", text)
        if not s:
            return False
        for char in s:
            cat = unicodedata.category(char)
            # Unicode中P开头的类别都是标点符号
            # Pc: 连接标点, Pd: 破折号, Pe: 结束标点, Pf: 最终引号
            # Pi: 初始引号, Po: 其他标点, Ps: 开始标点
            if not cat.startswith("P"):
                return False
        return True

    """对于长句子进行拆分适配字幕的显示"""
    zh_seg = pysbd.Segmenter(language="zh", clean=True)
    en_seg = pysbd.Segmenter(language="en", clean=True)
    segments = zh_seg.segment(text)
    split_texts: list[str] = []
    for segment in segments:
        # 默认1080P展示长度38
        if len(segment) > 38:
            en_segments = en_seg.segment(segment)
            split_texts.extend(en_segments)
        else:
            split_texts.append(segment)
    
    # 过滤掉只有标点符号和空格的文本
    split_texts = [text for text in split_texts if not is_all_punctuation(text) and not text.isspace()]
    return split_texts


def fix_latex_in_text(text: str | None) -> str:
    def check_backslash(match, double_dollars=False):
        latex_content = match.group(1)
        # 删除开头和结尾的换行符
        if latex_content.startswith('\n'):
            latex_content = latex_content[1:]
        if latex_content.endswith('\n'):
            latex_content = latex_content[:-1]
        # 转原始字符串
        latex_content = json.dumps(latex_content, ensure_ascii=False)[1:-1]
        # 公式中可能存在有的地方输出的转义，有的又没有，所以统一处理
        # 确保公式中的单斜杠
        # 本来就是转义单斜杠的原始字符串是\\\\
        # 没有转义的单斜杠的原始字符串是\\
        # 这样处理就可以不管转义还是非转义，最终都是\\
        fixed_content = latex_content.replace('\\\\', '\\')
        tag = '$' if not double_dollars else '$$'
        return f"{tag}{fixed_content}{tag}"
    if not text: return ""
    # 先处理 $$...$$（显示模式）
    text = re.sub(r'\$\$([^$]+)\$\$', lambda m: check_backslash(m, double_dollars=True), text)
    # 再处理 $...$（行内模式）
    text = text.replace('$$', '[double dollars]')
    text = re.sub(r'\$([^$]+)\$', lambda m: check_backslash(m, double_dollars=False), text)
    text = text.replace('[double dollars]', '$$')
    return text