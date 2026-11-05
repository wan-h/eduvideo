# -*- coding: utf-8 -*-
'''
@File    :   logger.py
@Author  :   一力辉 
'''

import os
import logging
import warnings
from datetime import datetime
from logging.handlers import RotatingFileHandler
from .env import LOG_PATH
from .config_parser import config

__all__ = ["logger"]

LOGGER_FOLDER = os.path.join(LOG_PATH, datetime.now().strftime("%Y%m%d%H%M%S"))
LOGGER_MAX_BYTES = 1024 * 1024 * 100
LOGGER_BACKUP_COUNT = 3
LOGGER_FORMAT = "[%(levelname)s]%(asctime)s File '%(filename)s',line %(lineno)s: %(message)s"

def checkLoggerPath():
    if not os.path.exists(LOGGER_FOLDER):
        os.makedirs(LOGGER_FOLDER, exist_ok=True)

def getLogger(loggerName: str):
    checkLoggerPath()
    loggerFile = os.path.join(LOGGER_FOLDER, loggerName + "_log.txt")

    logger = logging.getLogger(loggerName)
    logger.setLevel(logging.DEBUG)

    # 日志记录
    fileHandler = RotatingFileHandler(
        loggerFile,
        maxBytes=LOGGER_MAX_BYTES,
        backupCount=LOGGER_BACKUP_COUNT,
        encoding="utf-8"
    )
    fileHandler.setLevel(logging.DEBUG)
    fileFormatter = logging.Formatter(LOGGER_FORMAT)
    fileHandler.setFormatter(fileFormatter)

    # 终端显示
    streamHander = logging.StreamHandler()
    formatter = logging.Formatter(LOGGER_FORMAT)
    streamHander.setFormatter(formatter)
    
    # 设置日志等级
    if config.common.log_level == "DEBUG":
        fileHandler.setLevel(logging.DEBUG)
        streamHander.setLevel(logging.DEBUG)
    elif config.common.log_level == "INFO":
        fileHandler.setLevel(logging.INFO)
        streamHander.setLevel(logging.INFO)
    elif config.common.log_level == "WARNING":
        fileHandler.setLevel(logging.WARNING)
        streamHander.setLevel(logging.WARNING)
    elif config.common.log_level == "ERROR":
        fileHandler.setLevel(logging.ERROR)
        streamHander.setLevel(logging.ERROR)
    else:
        warnings.warn(f"Unknown logging level: {config.common.log_level}, set logging level to DEBUG!")
        fileHandler.setLevel(logging.DEBUG)
        streamHander.setLevel(logging.DEBUG)

    logger.addHandler(fileHandler)
    logger.addHandler(streamHander)

    return logger

logger = getLogger("system")
# 额外配置 Temporal 工作流的 logger，使其级别与日志处理器和 config.common.log_level 保持一致
getLogger("temporalio.workflow")