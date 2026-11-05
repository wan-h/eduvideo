# -*- coding: utf-8 -*-
'''
@File    :   tts_v0.py
@Author  :   一力辉
'''

import os
import httpx
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, Request, Form, UploadFile, File
from src.schema import TASK_TYPE, MODEL_PROVIDER, LANGUAGE_TYPE, VOICE_TYPE
from src.server.depends import HeaderInfo, DBSession
from src.server.exceptions import InvalidException
from src.server.api.task.schema import TaskSubmitResp, TaskInfoResp
from src.server.api.task.task_v0 import submit_task, get_task_status
from src.server.schema.request import BaseResponse
from src.tasks.schema import BaseWorkflowParams
from src.tasks.readable_tts.schema import ReadableTTSReq
from src.utils import config
from src.utils.func import get_bytes_md5
from src.server.dal.storage import StorageDAL
from src.server.dal.eduvideo import VoiceCloneRecordDAL, EdtTtsRecordDAL

from .utils import get_voice_model_id, get_voice_label, get_voice_language, get_voice_url

router = APIRouter(prefix="/eduvideo/v0/tts")

# ========================= 获取编辑提示 ===========================
class EditTipsResp(BaseResponse):
    data: list[str]
@router.get("edit/tips", response_model=EditTipsResp, summary="Get Edit Tips")
async def api_get_edit_tips(
    header: HeaderInfo
):
    if header.language == "en":
        tips = [
            'Chinese pronunciation can be precisely controlled using Pinyin wrapped in parentheses, e.g., 这是(he2)平, (huo4)面.',
            'English pronunciation can be precisely controlled using IPA phonemes wrapped in parentheses, e.g., The word live is pronounced (lɪv) as a verb and (laɪv) as an adjective.'
        ]
    else:
        tips = [
            '中文发音可使用拼音用英文小括号包裹进行精准控制，例如：这是(he2)平，(huo4)面。',
            '英文发音可使用IPA音标用英文小括号包裹进行精准控制，例如：The word live is pronounced (lɪv) as a verb and (laɪv) as an adjective.'
        ]
    return BaseResponse(data=tips)

# ========================= 语音克隆 ===========================
class VoiceCloneResp(BaseResponse):
    data: str
@router.post("/clone", response_model=VoiceCloneResp, summary="Voice Clone")
async def api_voice_clone(
    header: HeaderInfo, 
    session: DBSession,
    name: str = Form(..., description="音色名字"),
    text: str = Form(..., description="TTS文本内容"),
    audio: UploadFile = File(..., description="音频文件"),
    provider: MODEL_PROVIDER = Form(config.product.eduvideo.tts_clone.provider, description="模型提供方")
):
    # 校验克隆限制数量
    async with session.begin():
        voice_clone_record_dal = VoiceCloneRecordDAL(session)
        count = await voice_clone_record_dal.query_count_by_user_id(header.user_id)
    limit = config.product.eduvideo.tts_clone.limit
    if count >= limit:
        raise InvalidException.InvalidInput(f"Your voice clone limit ({limit}) has been reached. Current active clones: {count}")

    audio_bytes = await audio.read()
    md5 = get_bytes_md5(audio_bytes)
    extension = os.path.splitext(audio.filename or "")[1]
    file_name = f"{md5}{extension}"
    
    audio_url = await StorageDAL.upload_file(
        user_id=header.user_id,
        file_name=file_name,
        file=audio_bytes,
        tag="voice-clone"
    )

    try:
        if provider == MODEL_PROVIDER.ALIYUN:
            import uuid
            url = config.product.eduvideo.tts_clone.base_url
            headers = {
                "Authorization": f"Bearer {config.product.eduvideo.tts_clone.api_key}",
                "Content-Type": "application/json; charset=utf-8"
            }
            
            # 阿里云定制需要传入自定义的 voice_id 标识，我们生成一个唯一的 ID
            voice_id = f"{uuid.uuid4()}"
            model = config.product.eduvideo.tts_clone.model
                
            payload = {
                "input": {
                    "action": "voice_clone",
                    "voice_id": voice_id,
                    "audio_url": audio_url,
                    "text": text
                },
                "model": model
            }
            
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, headers=headers, json=payload, timeout=60.0)
                resp.raise_for_status()
                # 校验响应以确保克隆成功
                # result = resp.json()
                # 阿里云成功响应中可能会包含 output，如果没有抛异常则认为我们传的 voice_id 可以直接使用
                # 有些接口可能在 output.voice.voice_id 里返回
                # if "output" in result and "voice" in result["output"]:
                #     voice_id = result["output"]["voice"].get("voice_id") or voice_id
        elif provider == MODEL_PROVIDER.MINIMAX:
            import uuid

            # MiniMax 音色复刻：先上传音频拿 file_id，再提交复刻请求
            base_url = config.product.eduvideo.tts_clone.base_url.rstrip("/")
            if base_url.endswith("/t2a_v2"):
                base_url = base_url[: -len("/t2a_v2")]
            headers = {
                "Authorization": f"Bearer {config.product.eduvideo.tts_clone.api_key}"
            }

            async with httpx.AsyncClient(timeout=120.0) as client:
                files = {
                    "file": (
                        audio.filename or "audio.wav",
                        audio_bytes,
                        audio.content_type or "audio/wav"
                    )
                }
                upload_resp = await client.post(
                    f"{base_url}/files/upload",
                    headers=headers,
                    files=files,
                    data={"purpose": "voice_clone"}
                )
                upload_resp.raise_for_status()
                upload_result = upload_resp.json()
                upload_base_resp = upload_result.get("base_resp") or {}
                upload_status_code = upload_base_resp.get("status_code", 0)
                if upload_status_code != 0:
                    raise Exception(
                        f"MiniMax file upload failed: {upload_status_code} {upload_base_resp.get('status_msg')}"
                    )
                file_id = (upload_result.get("file") or {}).get("file_id")
                if file_id is None:
                    raise Exception("MiniMax file upload failed: missing file_id")

                # voice_id 需满足：8-256 字符、首字符为字母、仅含字母/数字/-/_
                voice_id = f"voice{uuid.uuid4().hex}"
                model = config.product.eduvideo.tts_clone.model
                if model.lower().startswith("minimax/"):
                    model = model.split("/", 1)[1]
                payload = {
                    "file_id": file_id,
                    "voice_id": voice_id,
                    "text": text,
                    "model": model
                }
                resp = await client.post(f"{base_url}/voice_clone", headers=headers, json=payload)
                resp.raise_for_status()
                result = resp.json()
            base_resp = result.get("base_resp") or {}
            status_code = base_resp.get("status_code", 0)
            if status_code != 0:
                raise Exception(
                    f"MiniMax voice clone failed: {status_code} {base_resp.get('status_msg')}"
                )
        else:
            raise InvalidException.InvalidInput(f"Invalid provider: {provider}")

    except Exception as e:
        raise e
    
    async with session.begin():
        dal = VoiceCloneRecordDAL(session)
        await dal.create(
            user_id=header.user_id,
            name=name,
            voice_id=voice_id,
            provider=provider.value if hasattr(provider, 'value') else str(provider),
            prompt_text=text,
            audio=audio_url
        )
        
    return VoiceCloneResp(data=voice_id)

# ========================= 获取用户的克隆音色列表 ===========================
class VoiceCloneListResp(BaseResponse):
    class VoiceCloneDesc(BaseModel):
        id: str
        name: str
        voice_id: str
        created_at: datetime
    data: list[VoiceCloneDesc]

@router.get("/clone/voices", response_model=VoiceCloneListResp, summary="Get Cloned Voice List")
async def api_get_cloned_voice_list(
    header: HeaderInfo,
    session: DBSession
):
    async with session.begin():
        dal = VoiceCloneRecordDAL(session)
        records = await dal.query_by_user_id(header.user_id)
        
    return VoiceCloneListResp(
        data=[
            VoiceCloneListResp.VoiceCloneDesc(
                id=r.id,
                name=r.name,
                voice_id=r.voice_id,
                created_at=r.created_at
            )
            for r in records
        ]
    )


# ========================= 获取支持的系统音色列表 ===========================
class VoiceListResp(BaseResponse):
    class VoiceDesc(BaseModel):
        label: str
        url: str
        language: LANGUAGE_TYPE
        voice: str
    data: list[VoiceDesc]

@router.get("/voices", response_model=VoiceListResp, summary="Get Supported Voice List")
async def api_get_voice_list(
    header: HeaderInfo,
):
    return VoiceListResp(
        data=[VoiceListResp.VoiceDesc(
            label=get_voice_label(voice_type, language=header.language),
            voice=voice_type,
            language=get_voice_language(voice_type),
            url=get_voice_url(voice_type)
        ) for voice_type in VOICE_TYPE]
    )


# ========================= 提交视频语音合成任务 ===========================
class SubmitTTSTaskReq(ReadableTTSReq):
    script_id: str = Field(..., description="脚本ID")
    skip_translate: bool = Field(True, description="跳过翻译")

@router.post("", response_model=TaskSubmitResp, summary="Submit Question Explanation Video TTS Task")
async def api_submit_tts_task(
    request: Request,
    header: HeaderInfo, 
    session: DBSession,
    req: SubmitTTSTaskReq,
):
    # 解析音色 ID
    req.voice = get_voice_model_id(req.voice, req.language)

    resp = await submit_task(
        request=request,
        header=header,
        session=session,
        task_type=TASK_TYPE.READABLE_TTS,
        payload=req.model_dump_json(),
        workflow_param=BaseWorkflowParams(),
        use_fast_queue=True
    )

    async with session.begin():
        dal = EdtTtsRecordDAL(session)
        await dal.create(
            user_id=header.user_id,
            script_task_id=req.script_id,
            tts_task_id=resp.data
        )

    return resp


# ========================= 获取视频语音合成任务状态 ===========================
@router.get("/{task_id}", response_model=TaskInfoResp, summary="Get Question Explanation Video TTS Task Status")
async def api_get_tts_task_status(
    header: HeaderInfo, 
    session: DBSession,
    task_id: str
):
    return await get_task_status(
        header=header,
        session=session,
        task_type=TASK_TYPE.READABLE_TTS,
        task_id=task_id
    )