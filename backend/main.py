# -*- coding: utf-8 -*-
'''
@File    :   main.py
@Author  :   一力辉 
'''

import uvicorn
from src.utils import logger, config

def showEnv():
    logger.info("[System] Welcome to Awesome digitalHuman System")
    logger.info(f"[System] Runing config:\n{config}")


if __name__ == '__main__':
    showEnv()
    reload = config.common.env == "dev"
    uvicorn.run('src.server.app:app', host=config.server.ip, port=config.server.port, log_level="info", reload=reload)

