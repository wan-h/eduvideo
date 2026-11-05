# -*- coding: utf-8 -*-
'''
@File    :   path.py
@Author  :   一力辉 
'''

import os
import warnings

# ================ 路径 ====================
ROOT_PATH = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG_ROOT_PATH = os.path.join(ROOT_PATH, "configs")
CONFIG_PROD_FILE = os.path.join(CONFIG_ROOT_PATH, "config.prod.yaml")
CONFIG_DEV_FILE = os.path.join(CONFIG_ROOT_PATH, "config.dev.yaml")

# 默认使用dev模式
if not os.environ.get("SERVER_ENV"):
    warnings.warn("SERVER_ENV not set, use dev mode")
    CONFIG_FILE = CONFIG_DEV_FILE
elif os.environ.get("SERVER_ENV").lower() == "prod":
    if not os.path.exists(CONFIG_PROD_FILE):
        raise FileNotFoundError("config.prod.yaml not found")
    CONFIG_FILE = CONFIG_PROD_FILE
elif os.environ.get("SERVER_ENV").lower() == "dev":
    if not os.path.exists(CONFIG_DEV_FILE):
        raise FileNotFoundError("config.dev.yaml not found")
    CONFIG_FILE = CONFIG_DEV_FILE
else:
    raise ValueError(f"Invalid SERVER_ENV: {os.environ.get('SERVER_ENV')}, expected 'dev' or 'prod'")

LOG_PATH = os.path.join(ROOT_PATH, "logs")