#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一键启动后端 API 服务和所有 Temporal Workers 的本地测试/开发服务组脚本。

使用方式:
    python scripts/start_dev.py
    或者在 backend 目录下直接运行:
    bash scripts/start_dev.sh

可选参数:
    --only-api       仅启动 FastAPI API 服务
    --only-workers   仅启动 Temporal Workers
"""

import argparse
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

# 获取 backend 根目录路径
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent

# 需启动的 9 个 Temporal Worker 模块定义
WORKER_MODULES = [
    ("BaseWorker", "src.tasks.base.worker"),
    ("DocParseWorker", "src.tasks.doc_parse.worker"),
    ("ReadableTTSWorker", "src.tasks.readable_tts.worker"),
    ("ReadableTTSFastWorker", "src.tasks.readable_tts.fast_worker"),
    ("ScriptGenWorker", "src.tasks.question_explanation_video_gen.script_gen.worker"),
    ("VideoSynthesisWorker", "src.tasks.question_explanation_video_gen.video_synthesis.worker"),
    ("QuestionExtractWorker", "src.tasks.question_extract.worker"),
    ("QuestionSolveWorker", "src.tasks.question_solve.worker"),
    ("QuestionParseWorker", "src.tasks.question_parse.worker"),
]

processes: list[tuple[str, subprocess.Popen]] = []


def terminate_all_processes(signum=None, frame=None):
    """优雅停止所有正在运行的子进程"""
    if not processes:
        sys.exit(0)

    print("\n" + "=" * 70)
    print("🛑 正在停止 API 服务和所有 Temporal Workers...")
    print("=" * 70)

    for name, proc in processes:
        if proc.poll() is None:
            try:
                print(f"   └─ 正在停止 {name} (PID: {proc.pid})...")
                proc.terminate()
            except Exception as e:
                print(f"   ⚠️ 停止 {name} 失败: {e}")

    time.sleep(1)

    # 强制杀死仍未退出的进程
    for name, proc in processes:
        if proc.poll() is None:
            try:
                print(f"   ⚡ 强制杀死 {name} (PID: {proc.pid})...")
                proc.kill()
            except Exception:
                pass

    print("✅ 所有进程已优雅退出。")
    sys.exit(0)


def main():
    parser = argparse.ArgumentParser(
        description="一键启动 FastAPI 服务和所有 9 个 Temporal Workers"
    )
    parser.add_argument("--only-api", action="store_true", help="仅启动 FastAPI API 服务")
    parser.add_argument("--only-workers", action="store_true", help="仅启动 Temporal Workers")
    args = parser.parse_args()

    # 监听中断信号 (Ctrl+C / kill)
    signal.signal(signal.SIGINT, terminate_all_processes)
    signal.signal(signal.SIGTERM, terminate_all_processes)

    # 确保 PYTHONPATH 包含 backend 根目录
    env = os.environ.copy()
    existing_pythonpath = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = (
        f"{BACKEND_DIR}:{existing_pythonpath}"
        if existing_pythonpath
        else str(BACKEND_DIR)
    )

    python_executable = sys.executable

    print("=" * 70)
    print("🚀 启动后端 API 服务及 Temporal Workers (本地开发/测试模式)")
    print(f"📂 工作路径: {BACKEND_DIR}")
    print(f"🐍 Python 执行器: {python_executable}")
    print("=" * 70)

    # 0. 执行数据库迁移 (建库 + alembic upgrade head)，失败则不启动
    print("\n▶ [0/2] 执行数据库迁移 (scripts/migrate.py)...")
    migrate_result = subprocess.run(
        [python_executable, "scripts/migrate.py"],
        cwd=str(BACKEND_DIR),
        env=env,
    )
    if migrate_result.returncode != 0:
        print("❌ 数据库迁移失败，已中止启动。")
        sys.exit(migrate_result.returncode)

    # 1. 启动 API 服务 (main.py)
    if not args.only_workers:
        print("\n▶ [1/2] 启动 API 服务 (main.py)...")
        api_proc = subprocess.Popen(
            [python_executable, "main.py"],
            cwd=str(BACKEND_DIR),
            env=env,
        )
        processes.append(("API-Server (main.py)", api_proc))
        print(f"   ✅ API-Server 已启动 (PID: {api_proc.pid})")

    # 2. 启动所有 Temporal Workers
    if not args.only_api:
        print(f"\n▶ [2/2] 启动 {len(WORKER_MODULES)} 个 Temporal Workers...")
        for name, module_path in WORKER_MODULES:
            worker_proc = subprocess.Popen(
                [python_executable, "-m", module_path],
                cwd=str(BACKEND_DIR),
                env=env,
            )
            processes.append((name, worker_proc))
            print(f"   ✅ [{name}] 已启动 (PID: {worker_proc.pid}) -> {module_path}")

    print("\n" + "=" * 70)
    print("🎉 所有服务与 Temporal Workers 已成功启动运行！按 Ctrl+C 可停止全套服务。")
    print("=" * 70 + "\n")

    # 持续监控子进程
    try:
        while True:
            time.sleep(2)
            for name, proc in list(processes):
                ret_code = proc.poll()
                if ret_code is not None:
                    print(
                        f"⚠️ [警告] 服务 [{name}] (PID: {proc.pid}) 已退出，退出状态码: {ret_code}"
                    )
                    processes.remove((name, proc))
            if not processes:
                print("所有子进程已退出。")
                break
    except KeyboardInterrupt:
        terminate_all_processes()


if __name__ == "__main__":
    main()
