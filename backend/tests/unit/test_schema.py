# -*- coding: utf-8 -*-
"""
Unit tests for schema definitions and Enums in backend/src/schema.py.
"""

from src.schema import SUBJECT_TYPE, VIDEO_RESOLUTION_TYPE


def test_video_resolution_type_enum():
    """Test resolution dimensions helper property."""
    assert VIDEO_RESOLUTION_TYPE.P_720.resolution == (1280, 720)
    assert VIDEO_RESOLUTION_TYPE.P_1080.resolution == (1920, 1080)
    assert VIDEO_RESOLUTION_TYPE.K_2.resolution == (2048, 1080)


def test_subject_type_enum():
    """Test SUBJECT_TYPE DescriptionEnum values and descriptions."""
    assert SUBJECT_TYPE.CHINESE.value == "chinese"
    assert SUBJECT_TYPE.CHINESE.description == "语文"
    assert SUBJECT_TYPE.MATH.value == "math"
    assert SUBJECT_TYPE.MATH.description == "数学"
