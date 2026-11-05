import os

import httpx

"""
https://help.aliyun.com/zh/model-studio/minimax-synchronous-speech-synthesis-api
"""

# 运行前设置环境变量 DASHSCOPE_API_KEY
API_KEY = os.environ.get("DASHSCOPE_API_KEY", "")

url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}
payload = {
    "input": {
        "action": "tts",
        "text": "同学们好，今天我们来分析一道结合数学史、对数运算和数列求和的综合题，目标是找到一个恒成立的不等关系。",
        "stream": False,
        "voice_setting": {
            "voice_id": "male-qn-jingying-jingpin",
            # "voice_id": "female-shaonv-jingpin",
            # "voice_id": "English_Gentle-voiced_man",
            # "voice_id": "English_CalmWoman",
            # "voice_id": "English_Magnetic_Male_12",
            # "voice_id": "English_Graceful_Lady",
            "speed": 1,
            "vol": 1,
            "pitch": 0,
        },
        "audio_setting": {
            "sample_rate": 16000,
            "format": "mp3",
            "channel": 1,
        },
    },
    "model": "MiniMax/speech-2.8-turbo",
}

with httpx.Client() as client:
    import time
    a = time.time()
    response = client.post(url, headers=headers, json=payload)
    b = time.time()
    print(f"response time: {b - a:.2f} seconds")
    with open("output.mp3", "wb") as f:
        # 采用 hex 编码
        audio = response.json()["output"]["data"]["audio"]
        f.write(bytes.fromhex(audio))