# -*- coding: utf-8 -*-


import re
import httpx
from pydub import AudioSegment
from io import BytesIO
from src.schema import MODEL_PROVIDER, AUDIO_TYPE, SUBJECT_TYPE
from src.utils import logger
from .schema import TTS_MODEL_TYPE


VOCABULARY_MAPPING_TABLE_CHEMISTRY: dict[str, dict[str, str] | str] = {
    "醚": "(mi2)",
    "苯": "(ben3)",
    "羟": "(qiang1)",
    "勒": "(le4)",
    # 元素周期表
    "氢": "(qing1)",
    "氦": "(hai2)",
    "锂": "(li3)",
    "铍": "(pi2)",
    "硼": "(peng2)",
    "碳": "(tan4)",
    "氮": "(dan4)",
    "氧": "(yang3)",
    "氟": "(fu2)",
    "氖": "(nai3)",
    "钠": "(na4)",
    "镁": "(mei3)",
    "铝": "(lv3)",
    "硅": "(gui1)",
    "磷": "(lin2)",
    "硫": "(liu2)",
    "氯": "(lv4)",
    "氩": "(ya4)",
    "钾": "(jia3)",
    "钙": "(gai4)",
    "钪": "(kang4)",
    "钛": "(tai4)",
    "钒": "(fan2)",
    "铬": "(ge4)",
    "锰": "(meng3)",
    "铁": "(tie3)",
    "钴": "(gu3)",
    "镍": "(nie4)",
    "铜": "(tong2)",
    "锌": "(xin1)",
    "镓": "(jia2)",
    "锗": "(zhe3)",
    "砷": "(shen1)",
    "硒": "(xi1)",
    "溴": "(xiu4)",
    "氪": "(ke4)",
    "铷": "(ru2)",
    "锶": "(si1)",
    "钇": "(yi3)",
    "锆": "(gào)",
    "铌": "(ni2)",
    "钼": "(mu4)",
    "锝": "(de2)",
    "钌": "(liao3)",
    "铑": "(lao3)",
    "钯": "(ba3)",
    "银": "(yin2)",
    "镉": "(ge2)",
    "铟": "(yin1)",
    "锡": "(xi1)",
    "锑": "(ti1)",
    "碲": "(di4)",
    "碘": "(dian3)",
    "氙": "(xian1)",
    "铯": "(se4)",
    "钡": "(bei4)",
    "镧": "(lan2)",
    "铈": "(shi4)",
    "镨": "(pu3)",
    "钕": "(nv3)",
    "钷": "(po3)",
    "钐": "(shan1)",
    "铕": "(you3)",
    "钆": "(ga2)",
    "铽": "(te4)",
    "镝": "(di1)",
    "钬": "(huo3)",
    "铒": "(er3)",
    "铥": "(diu1)",
    "镱": "(yi4)",
    "镥": "(lu3)",
    "铪": "(ha1)",
    "钽": "(tan3)",
    "钨": "(wu1)",
    "铼": "(lai2)",
    "锇": "(e2)",
    "铱": "(yi1)",
    "铂": "(bo2)",
    "金": "(jin1)",
    "汞": "(gong3)",
    "铊": "(ta1)",
    "铅": "(qian1)",
    "铋": "(bi4)",
    "钋": "(po1)",
    "砹": "(ai4)",
    "氡": "(dong1)",
    "钫": "(fang1)",
    "镭": "(lei2)",
    "锕": "(a1)",
    "钍": "(tu3)",
    "镤": "(pu2)",
    "铀": "(you2)",
    "镎": "(na2)",
    "钚": "(bu4)",
    "镅": "(mei2)",
    "锔": "(ju2)",
    "锫": "(pei2)",
    "锎": "(kai1)",
    "锿": "(ai1)",
    "镄": "(fei4)",
    "钔": "(men2)",
    "锘": "(nuo4)",
    "铹": "(lao2)",
    "𬬻": "(lu2)",
    "𬭊": "(du4)",
    "𬭳": "(xi3)",
    "𬭛": "(bo1)",
    "𬭶": "(hei1)",
    "鿏": "(mai4)",
    "𫟼": "(da2)",
    "𬬭": "(lun2)",
    "鿔": "(ge1)",
    "鿭": "(ni3)",
    "𫓧": "(fu1)",
    "镆": "(mo4)",
    "𫟷": "(li4)",
    "鿬": "(tian2)",
    "鿫": "(ao4)",
}
VOCABULARY_MAPPING_TABLE_MATH: dict[str, dict[str, str] | str] = {
    # 数学
    "奇": {
        "奇数": "(ji1)",
        "奇偶": "(ji1)",
        "奇函数": "(ji1)",
        "非奇": "(ji1)",
        "奇次": "(ji1)",
    },
    "幂": {
        "幂函数": "(mi4)",
        "幂级数": "(mi4)",
        "指数幂": "(mi4)",
        "幂次方": "(mi4)",
        "幂运算": "(mi4)",
    },
    "得": {
        "得证": "(de2)",
    },
    "调": {"单调": "(diao4)", "调取": "(diao4)", "调用": "(diao4)"},
}
VOCABULARY_MAPPING_TABLE_DEFAULT: dict[str, dict[str, str] | str] = {
    "重": {"重根": "(chong2)", "重解": "(chong2)", "重力": "(zhong4)"},
    "弹": {
        "弹力": "(tan2)",
    },
    "长": {
        "总长": "(chang2)",
        "长度": "(chang2)",
    },
}

def pronunciation_map(
    tts_text: str, 
    model_type: TTS_MODEL_TYPE,
    pronunciation_vocabulary_table: dict[str, dict[str, str] | str]
) -> str:
    """
    词汇表映射，解决生僻字多音字错误发音问题
    fish规则：<|phoneme_start|>ji1<|phoneme_end|>
    minimax规则：奇/(ji1)
    """
    def parse_pinyin(template: str) -> list[str]:
        """
        解析拼音
        """
        pattern = r"\(([^)]*)\)"
        result = re.findall(pattern, template)
        return result

    result_text = tts_text
    for k, v in pronunciation_vocabulary_table.items():
        if k not in result_text:
            continue
        if isinstance(v, dict):
            if len(k) != 1:
                raise ValueError(f"配置多音字组词的触发字必须为单个字，当前为：{k}")
            # 组词替换
            for sub_k, sub_v in v.items():
                if sub_k not in result_text:
                    continue
                pinyins = parse_pinyin(sub_v)
                if len(pinyins) != 1:
                    raise ValueError(f"配置多音字组词的拼音必须为单个字，当前为：{sub_v}")
                pinyin = pinyins[0]
                
                if model_type == TTS_MODEL_TYPE.FISH:
                    replace_template = sub_k.replace(k, f"<|phoneme_start|>{pinyin}<|phoneme_end|>")
                elif model_type == TTS_MODEL_TYPE.MINIMAX:
                    replace_template = sub_k.replace(k, f"({pinyin})")
                else:
                    replace_template = sub_k
                
                result_text = result_text.replace(sub_k, replace_template)
        else:
            pinyins = parse_pinyin(v)
            if len(k) != len(pinyins):
                raise ValueError("拼音数量和汉字数量不一致")

            if model_type == TTS_MODEL_TYPE.FISH:
                replace_val = f"<|phoneme_start|>{''.join(pinyins)}<|phoneme_end|>"
            elif model_type == TTS_MODEL_TYPE.MINIMAX:
                replace_val = "".join([f"{char}/({pinyin})" for char, pinyin in zip(k, pinyins)])
            else:
                replace_val = k
                
            result_text = result_text.replace(k, replace_val)
    return result_text



def is_all_chinese(text: str) -> bool:
    """只有常见的中文字符以及标点符号"""
    pattern = r"^([\u4e00-\u9fa5\u3002\uFF0C\uFF1F\uFF01\uFF1A\u002E\u002C\u003F\u0021\u003A\s])+$"
    return re.match(pattern, text) is not None


def contains_latex(text: str) -> bool:
    """
    检查字符串中是否存在被 $ 或 $$ 包裹的 LaTeX 公式。
    
    参数:
        text (str): 要检查的字符串
        
    返回:
        bool: 如果存在 LaTeX 公式返回 True，否则返回 False
    """
    # 正则表达式解释:
    # (?<!\\)       : 负向后行断言，确保 $ 前面没有反斜杠（排除转义符 \$）
    # (\${1,2})     : 匹配 1 个或 2 个 $ 符号，并捕获到第1组
    # .*?           : 非贪婪匹配任意字符（公式内容）
    # \1            : 反向引用，匹配与第1组相同的符号数量（即如果开头是$，结尾必须是$；如果是$$，结尾必须是$$）
    # (?<!\\)       : 确保结尾的 $ 前面没有反斜杠
    pattern = r'(?<!\\)(\${1,2}).*?\1(?<!\\)'
    
    # 使用 re.search 查找字符串中是否存在匹配项
    # re.DOTALL 标志使 . 能够匹配换行符，从而支持多行的块级公式
    if re.search(pattern, text, re.DOTALL):
        return True
    return False

def mp3_to_wav(mp3_bytes: bytes) -> bytes:
    mp3Data = BytesIO(mp3_bytes)
    audio = AudioSegment.from_mp3(mp3Data)
    wavData = BytesIO()
    audio.export(wavData, format="wav")
    wavBytes = wavData.getvalue()
    return wavBytes

def wav_to_mp3(wav_bytes: bytes) -> bytes:
    wavData = BytesIO(wav_bytes)
    audio = AudioSegment.from_wav(wavData)
    mp3Data = BytesIO()
    audio.export(mp3Data, format="mp3")
    mp3Bytes = mp3Data.getvalue()
    return mp3Bytes

async def provider_tts(
    provider: MODEL_PROVIDER,
    subject_type: SUBJECT_TYPE,
    model: str,
    base_url: str,
    api_key: str,
    text: str,
    voice: str,
    spped: float
) -> bytes:
    # 构造词汇表, 做发音映射
    vocabulary_table = VOCABULARY_MAPPING_TABLE_DEFAULT.copy()
    if subject_type == SUBJECT_TYPE.MATH:
        vocabulary_table.update(VOCABULARY_MAPPING_TABLE_MATH)
    elif subject_type == SUBJECT_TYPE.CHEMISTRY:
        vocabulary_table.update(VOCABULARY_MAPPING_TABLE_CHEMISTRY)
    
    if "fish" in model.lower():
        model_type = TTS_MODEL_TYPE.FISH
    elif "minimax" in model.lower():
        model_type = TTS_MODEL_TYPE.MINIMAX
    else:
        model_type = TTS_MODEL_TYPE.MINIMAX
        # raise Exception(f"Unsupported TTS model: {model}")
    
    text = pronunciation_map(
        tts_text=text, 
        model_type=model_type, 
        pronunciation_vocabulary_table=vocabulary_table
    )
    logger.debug(f"[readable_tts](pronunciation_map) pronunciation text: {text}")

    # 调用tts接口
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    if provider == MODEL_PROVIDER.MINIMAX:
        # 兼容 DashScope 的 "MiniMax/xxx" 模型名写法，直连 MiniMax 时去掉前缀
        if model.lower().startswith("minimax/"):
            model = model.split("/", 1)[1]

        payload = {
            "model": model,
            "text": text,
            "stream": False,
            "voice_setting": {
                "voice_id": voice,
                "speed": spped,
                "vol": 1,
                "pitch": 0,
            },
            "audio_setting": {
                "sample_rate": 32000,
                "bitrate": 128000,
                "format": AUDIO_TYPE.MP3.value,
                "channel": 1,
            },
            "language_boost": "auto",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(base_url, headers=headers, json=payload)
            response.raise_for_status()
        result = response.json()
        base_resp = result.get("base_resp") or {}
        status_code = base_resp.get("status_code", 0)
        if status_code != 0:
            raise Exception(
                f"MiniMax TTS failed: {status_code} {base_resp.get('status_msg')}"
            )
        audio_hex = (result.get("data") or {}).get("audio")
        if not audio_hex:
            raise Exception("MiniMax TTS failed: empty audio data")
        return bytes.fromhex(audio_hex)
    elif provider == MODEL_PROVIDER.ALIYUN:
        payload = {
            "input": {
                "action": "tts",
                "text": text,
                "stream": False,
                "voice_setting": {
                    "voice_id": voice,
                    "speed": spped,
                    "vol": 1,
                    "pitch": 0,
                },
                "audio_setting": {
                    "sample_rate": 16000,
                    "format": AUDIO_TYPE.MP3.value,
                    "channel": 1,
                },
            },
            "model": model,
        }

        with httpx.Client() as client:
            response = client.post(base_url, headers=headers, json=payload)
            response.raise_for_status()
            audio_bytes = bytes.fromhex(response.json()["output"]["data"]["audio"])
            return audio_bytes
    else:
        raise Exception(f"Unsupported TTS provider: {provider}")