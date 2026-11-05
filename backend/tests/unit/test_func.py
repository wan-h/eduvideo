# -*- coding: utf-8 -*-
"""
Unit tests for helper functions in backend/src/utils/func.py.
"""

from src.utils.func import count_text_length, get_bytes_md5


def test_count_text_length():
    """Test text length calculation for ASCII, CJK characters, and mixed text."""
    # Pure ASCII words (each English word/digit string counts as 1)
    assert count_text_length("hello world") == 2
    assert count_text_length("") == 0

    # CJK characters (each Chinese character counts as 1, each punctuation counts as 1)
    assert count_text_length("中文测试") == 4
    assert count_text_length("你好，世界！") == 6

    # Mixed text: Hello(1) + ,(1) + 世(1) + 界(1) + !(1) = 5
    assert count_text_length("Hello, 世界!") == 5


def test_get_bytes_md5():
    """Test MD5 hash generation for byte content."""
    data = b"hello world"
    md5_hash = get_bytes_md5(data)

    assert isinstance(md5_hash, str)
    assert len(md5_hash) == 32
    assert md5_hash == "5eb63bbbe01eeed093cb22bb8f5acdc3"


def test_get_bytes_md5_empty():
    """Test MD5 hash generation for empty byte content."""
    data = b""
    md5_hash = get_bytes_md5(data)

    assert len(md5_hash) == 32
    assert md5_hash == "d41d8cd98f00b204e9800998ecf8427e"
