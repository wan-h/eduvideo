# -*- coding: utf-8 -*-
'''
@File    :   utils.py
@Author  :   一力辉
'''

import magic
import hashlib

__all__ = ['get_file_content_mime_type', 'get_bytes_md5', 'count_text_length']

def get_file_content_mime_type(file_content: str | bytes) -> str:
    mime_type = magic.from_buffer(file_content, mime=True)
    return mime_type

def get_bytes_md5(data: bytes) -> str:
    """
    获取字节数据的 MD5 值
    """
    md5_hash = hashlib.md5()
    md5_hash.update(data)
    return md5_hash.hexdigest()


def count_text_length(text: str) -> int:
    """
    计算文本长度（空白字符不计）：
    - 中文等 CJK 字符：每个字计 1
    - 标点符号（中英文均算）：每个计 1
    - 英文单词 / 数字串：整体计 1
    """
    import re
    TOKEN_PATTERN = re.compile(
        r'[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7a3]'  # 每个 CJK 字符计 1
        r'|[^\w\s]'        # 每个标点计 1（\w 在 Python3 含 CJK，故不会重复匹配）
        r'|[a-zA-Z0-9]+'   # 英文单词 / 数字串整体计 1
    )
    tokens = TOKEN_PATTERN.findall(text)
    return len(tokens)

if __name__ == '__main__':
    print(count_text_length('你好，世界！Hello, world!'))