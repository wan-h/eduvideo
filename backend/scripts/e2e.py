#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
@File    :   video.py
@Author  :   Antigravity
@Desc    :   Test script for validating video generation APIs (OpenAI style endpoints)
"""

import sys
import time
import json
import argparse
import urllib.request
import urllib.error

def send_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
        except Exception:
            err_json = err_body
        return e.code, err_json
    except Exception as e:
        return 500, {"error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="Test Client for EduVideo Video Generation API")
    parser.add_argument("--host", default="http://10.24.9.17:32694", help="API Host URL (default: http://127.0.0.1:3000)")
    parser.add_argument("--user-id", default="0c775bb2-6aae-4ad1-b8a1-4575dc2191ae", help="Test User ID (default: test-user-123)")
    parser.add_argument("--text", default="已知三角形的两边长分别为3和4，求第三边x的取值范围。", help="Question text to generate video for")
    parser.add_argument("--voice", default="", help="Voice model name (default: fishc)")
    parser.add_argument("--stage", default="junior", help="Education stage (primary/junior/senior/university)")
    parser.add_argument("--language", default="chinese", help="Target language")
    parser.add_argument("--resolution", default="1080p", choices=["720p", "1080p", "2K"], help="Output video resolution")
    parser.add_argument("--fps", type=int, default=30, help="Output video FPS")
    parser.add_argument("--speed", type=float, default=1.0, help="Output video speed")
    parser.add_argument("--poll-interval", type=int, default=5, help="Polling interval in seconds")

    args = parser.parse_args()

    headers = {
        "user-id": args.user_id,
        "request-id": f"test-req-{int(time.time())}"
    }

    # 1. 提交视频生成任务
    submit_url = f"{args.host}/api/education-ai/eduvideo/v0/video/generations"
    payload = {
        "text": args.text,
        "urls": [],
        "voice": args.voice,
        "stage": args.stage,
        "language": args.language,
        "video_export_desc": {
            "resolution": args.resolution,
            "background": "default",
            "opening_film": "",
            "closing_film": "",
            "watermark": "",
            "fps": args.fps,
            "speed": args.speed
        }
    }

    print(f"[*] Submitting video generation task to: {submit_url}")
    print(f"[*] Headers: {json.dumps(headers, indent=2)}")
    print(f"[*] Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
    
    code, resp = send_request(submit_url, method="POST", headers=headers, data=payload)
    if code != 200:
        print(f"[!] Submission failed with status {code}:")
        print(json.dumps(resp, indent=2, ensure_ascii=False))
        sys.exit(1)

    task_id = resp.get("data")
    if not task_id:
        print("[!] Task ID not found in response:")
        print(json.dumps(resp, indent=2, ensure_ascii=False))
        sys.exit(1)

    print(f"[+] Task submitted successfully! Task ID: {task_id}")
    print(f"[*] Polling task status every {args.poll_interval}s...")

    # 2. 轮询状态
    query_url = f"{args.host}/api/education-ai/eduvideo/v0/video/generations/{task_id}"
    
    while True:
        time.sleep(args.poll_interval)
        q_code, q_resp = send_request(query_url, method="GET", headers=headers)
        if q_code != 200:
            print(f"[!] Query status failed with status {q_code}: {q_resp}")
            continue
        
        task_data = q_resp.get("data", {})
        status = task_data.get("status")
        progress = task_data.get("progress", 0)
        message = task_data.get("message", "")
        
        # TASK_STATUS: 0 PENDING, 1 STARTED, 2 SUCCESS, 3 FAILURE
        status_str = {0: "PENDING", 1: "RUNNING", 10: "SUCCESS", 20: "FAILED"}.get(status, f"UNKNOWN({status})")
        
        print(f"[{time.strftime('%H:%M:%S')}] Status: {status_str} | Progress: {progress}% | Message: {message}")
        
        if status == 2: # SUCCESS
            print("\n[+] Video Generation Completed Successfully!")
            result = task_data.get("result", "")
            print(f"[+] Video URL: {result}")
            break
        elif status == 3: # FAILURE
            print("\n[!] Video Generation Failed.")
            print(f"[!] Final Message: {message}")
            sys.exit(1)

if __name__ == "__main__":
    main()
