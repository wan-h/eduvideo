# -*- coding: utf-8 -*-
'''
@File    :   configParser.py
@Author  :   一力辉 
'''

import os
import yaml
from src.schema import Config, ImageModelConfig, ModelConfig, MODEL_PROVIDER
from src.utils.env import CONFIG_FILE


__all__ = ['config']



def parseModelEnv(model: ModelConfig, prefix: str) -> None:
    # 大模型服务的 base_url / api_key / model / provider 统一支持 <prefix>_{BASE_URL|API_KEY|MODEL|PROVIDER} 覆盖
    if os.environ.get(f'{prefix}_BASE_URL'): model.base_url = os.environ[f'{prefix}_BASE_URL']
    if os.environ.get(f'{prefix}_API_KEY'): model.api_key = os.environ[f'{prefix}_API_KEY']
    if os.environ.get(f'{prefix}_MODEL'): model.model = os.environ[f'{prefix}_MODEL']
    if os.environ.get(f'{prefix}_PROVIDER'): model.provider = MODEL_PROVIDER(os.environ[f'{prefix}_PROVIDER'])
    if isinstance(model, ImageModelConfig) and os.environ.get(f'{prefix}_EDIT_MODEL'):
        model.edit_model = os.environ[f'{prefix}_EDIT_MODEL']


def parseTaskEnv(task: "Config.TasksConfig.TaskConfig", prefix: str) -> None:
    # 任务的队列名 / 并发 / 超时等标量配置统一支持 <prefix>_{TASK_QUEUE|FAST_TASK_QUEUE|CONCURRENCY|START_TO_CLOSE_TIMEOUT|MAX_TASK_QUEUE_ACTIVITIES_PER_SECOND} 覆盖
    if os.environ.get(f'{prefix}_TASK_QUEUE'): task.task_queue = os.environ[f'{prefix}_TASK_QUEUE']
    if os.environ.get(f'{prefix}_FAST_TASK_QUEUE'): task.fast_task_queue = os.environ[f'{prefix}_FAST_TASK_QUEUE']
    if os.environ.get(f'{prefix}_CONCURRENCY'): task.concurrency = int(os.environ[f'{prefix}_CONCURRENCY'])
    if os.environ.get(f'{prefix}_START_TO_CLOSE_TIMEOUT'): task.start_to_close_timeout = int(os.environ[f'{prefix}_START_TO_CLOSE_TIMEOUT'])
    if os.environ.get(f'{prefix}_MAX_TASK_QUEUE_ACTIVITIES_PER_SECOND'): task.max_task_queue_activities_per_second = float(os.environ[f'{prefix}_MAX_TASK_QUEUE_ACTIVITIES_PER_SECOND'])


def parseEnvConfig(config: Config) -> None:
    # 环境变量最高优先级
    if os.environ.get('POSTGRES_HOST'): config.middleware.database.host = os.environ.get('POSTGRES_HOST')
    if os.environ.get('POSTGRES_PORT'): config.middleware.database.port = int(os.environ.get('POSTGRES_PORT'))
    if os.environ.get('PGUSER'): config.middleware.database.user = os.environ.get('PGUSER')
    if os.environ.get('POSTGRES_PASSWORD'): config.middleware.database.passwd = os.environ.get('POSTGRES_PASSWORD')
    if os.environ.get('POSTGRES_DB'): config.middleware.database.db = os.environ.get('POSTGRES_DB')
    
    if os.environ.get('STORAGE_DOMAIN'): config.middleware.storage.domain = os.environ.get('STORAGE_DOMAIN')
    if os.environ.get('STORAGE_HOST'): config.middleware.storage.host = os.environ.get('STORAGE_HOST')
    if os.environ.get('STORAGE_PUBLIC_HOST'): config.middleware.storage.public_host = os.environ.get('STORAGE_PUBLIC_HOST')
    if os.environ.get('STORAGE_USER'): config.middleware.storage.user = os.environ.get('STORAGE_USER')
    if os.environ.get('STORAGE_PASSWORD'): config.middleware.storage.passwd = os.environ.get('STORAGE_PASSWORD')
    if os.environ.get('STORAGE_BUCKET'): config.middleware.storage.bucket = os.environ.get('STORAGE_BUCKET')

    if os.environ.get('TEMPORAL_SEVER_URL'): config.middleware.temporal.server_url = os.environ.get('TEMPORAL_SEVER_URL')
    if os.environ.get('TEMPORAL_TASK_UPDATE_URL'): config.tasks.server_url = os.environ.get('TEMPORAL_TASK_UPDATE_URL')
    if os.environ.get('SERVER_ENV'): config.common.env = os.environ.get('SERVER_ENV')
    if os.environ.get('SERVER_PORT'): config.server.port = int(os.environ.get('SERVER_PORT'))
    if os.environ.get('LOG_LEVEL'): config.common.log_level = os.environ.get('LOG_LEVEL')  # type: ignore
    if os.environ.get('LLM_IMAGE_INPUT'): config.common.llm_image_input = os.environ.get('LLM_IMAGE_INPUT')  # type: ignore

    # product.eduvideo 下的模型配置
    parseModelEnv(config.product.eduvideo.tts_clone, 'LLM_TTS_CLONE')
    if os.environ.get('LLM_TTS_CLONE_LIMIT'):
        config.product.eduvideo.tts_clone.limit = int(os.environ['LLM_TTS_CLONE_LIMIT'])
    parseModelEnv(config.product.eduvideo.agent_chat, 'LLM_AGENT_CHAT')
    if os.environ.get('LLM_AGENT_CHAT_HISTORY_LIMIT'):
        config.product.eduvideo.agent_chat.history_limit = int(os.environ['LLM_AGENT_CHAT_HISTORY_LIMIT'])
    parseModelEnv(config.product.eduvideo.magic_wand.text_model, 'LLM_MAGIC_WAND_TEXT')
    parseModelEnv(config.product.eduvideo.magic_wand.image_model, 'LLM_MAGIC_WAND_IMAGE')

    # tasks 下的模型配置
    parseModelEnv(config.tasks.doc_parse.mineru, 'LLM_DOC_PARSE')
    parseModelEnv(config.tasks.question_extract.extractor, 'LLM_QUESTION_EXTRACT')
    parseModelEnv(config.tasks.readable_tts.chinese, 'LLM_READABLE_TTS_ZH')
    parseModelEnv(config.tasks.readable_tts.english, 'LLM_READABLE_TTS_EN')
    parseModelEnv(config.tasks.readable_tts.chinese_translate, 'LLM_READABLE_TTS_ZH_TRANSLATE')
    parseModelEnv(config.tasks.readable_tts.latex_translate, 'LLM_READABLE_TTS_LATEX_TRANSLATE')
    parseModelEnv(config.tasks.question_explanation_video_gen_script.handout_generator, 'LLM_VIDEO_SCRIPT_HANDOUT')
    parseModelEnv(config.tasks.question_explanation_video_gen_script.image_generator, 'LLM_VIDEO_SCRIPT_IMAGE')
    parseModelEnv(config.tasks.question_solve.solver, 'LLM_QUESTION_SOLVE')
    parseModelEnv(config.tasks.question_parse.parser, 'LLM_QUESTION_PARSE')

    # tasks 下的任务队列 / 并发 / 超时配置
    if os.environ.get('TASK_MAX_RETRIES'): config.tasks.max_retries = int(os.environ['TASK_MAX_RETRIES'])
    parseTaskEnv(config.tasks.base_task, 'TASK_BASE')
    parseTaskEnv(config.tasks.doc_parse, 'TASK_DOC_PARSE')
    parseTaskEnv(config.tasks.question_extract, 'TASK_QUESTION_EXTRACT')
    parseTaskEnv(config.tasks.readable_tts, 'TASK_READABLE_TTS')
    parseTaskEnv(config.tasks.question_explanation_video_gen_script, 'TASK_VIDEO_SCRIPT')
    parseTaskEnv(config.tasks.question_explanation_video_gen_synthesis, 'TASK_VIDEO_SYNTHESIS')
    parseTaskEnv(config.tasks.question_solve, 'TASK_QUESTION_SOLVE')
    parseTaskEnv(config.tasks.question_parse, 'TASK_QUESTION_PARSE')
    if os.environ.get('TASK_VIDEO_SYNTHESIS_RENDER_MAX_CONCURRENCY'):
        config.tasks.question_explanation_video_gen_synthesis.render_max_concurrency = int(
            os.environ['TASK_VIDEO_SYNTHESIS_RENDER_MAX_CONCURRENCY']
        )
    if os.environ.get('TASK_VIDEO_SYNTHESIS_RENDER_PARALLEL_CHUNKS'):
        config.tasks.question_explanation_video_gen_synthesis.render_parallel_chunks = int(
            os.environ['TASK_VIDEO_SYNTHESIS_RENDER_PARALLEL_CHUNKS']
        )


def getConfig(configFile: str) -> Config:
    with open(configFile, 'r', encoding='utf-8') as f:
        config = Config(**yaml.load(f, Loader=yaml.FullLoader))
        parseEnvConfig(config)
        return config

config = getConfig(CONFIG_FILE)
