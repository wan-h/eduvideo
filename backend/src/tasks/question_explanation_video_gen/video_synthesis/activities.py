import asyncio
import http.server
import json
import os
import signal
import socketserver
import tempfile
import threading
import time
import typing
from collections import deque
from urllib import parse
from uuid import uuid4

import aiofiles
import httpx
from temporalio import activity
from temporalio.exceptions import CancelledError

from src.schema import TASK_STATUS, TASK_TYPE
from src.server.schema.eduvideo import VideoExportDesc
from src.tasks.base.activities import update_task_status
from src.tasks.base.schema import TaskStatusUpdateParams
from src.tasks.utils import download_file, storage_object_name, upload_file
from src.utils import config, logger

from .schema import RemotionScriptInput, VideoSynthesisParams, VideoSynthesisResult
from .utils import get_cpu_count

# Remotion 模板路径
REMOTION_TEMPLATE_PATH = os.path.join(
    os.path.dirname(__file__),
    "remotion_template",
    "frontend",
)


def _kill_process_group(process: asyncio.subprocess.Process | None) -> None:
    """终止子进程及其创建的整个进程组，防止残留孤儿进程"""
    if process is None or process.returncode is not None:
        return
    try:
        if hasattr(os, "killpg"):
            os.killpg(os.getpgid(process.pid), signal.SIGKILL)
        else:
            process.kill()
    except Exception:
        try:
            process.kill()
        except Exception:
            pass


async def _render_video_async(
    input_json_path: str,
    output_video_path: str,
    concurrency: int,
    workspace: str,
    export_settings: VideoExportDesc,
    params: VideoSynthesisParams,
    on_raw_progress: typing.Callable[[float], typing.Awaitable[None]] | None = None,
) -> None:
    # 使用独立临时缓存子目录存储 webpack bundle，避免多 chunk 并发渲染时的锁竞争与文件覆盖
    persistent_bundle_cache = os.path.join(tempfile.gettempdir(), "eduvideo_remotion_bundle_cache", f"bundle_{uuid4()}")
    cmd = [
        "pnpm",
        "render:video",
        "--input",
        input_json_path,
        "--output",
        output_video_path,
        "--bundle-cache-dir",
        persistent_bundle_cache,
        "--concurrency",
        str(concurrency),
        "--width",
        str(export_settings.resolution.resolution[0]),
        "--height",
        str(export_settings.resolution.resolution[1]),
        "--fps",
        str(export_settings.fps),
        "--background",
        export_settings.background,
        "--opening-film",
        export_settings.opening_film,
        "--closing-film",
        export_settings.closing_film,
        "--watermark",
        export_settings.watermark,
        "--page-layout",
        export_settings.page_layout,
        "--json",
    ]

    timeout_seconds = int(60 * config.tasks.question_explanation_video_gen_synthesis.start_to_close_timeout)

    process = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=REMOTION_TEMPLATE_PATH,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        start_new_session=True,
    )

    stderr_lines: list[str] = []
    # pnpm / 渲染脚本的部分错误信息输出到 stdout，保留非进度 JSON 的行用于失败诊断
    stdout_tail: deque[str] = deque(maxlen=50)

    async def read_stderr():
        if process.stderr is None:
            return
        while True:
            line = await process.stderr.readline()
            if not line:
                break
            stderr_lines.append(line.decode("utf-8", errors="ignore"))

    stderr_task = asyncio.create_task(read_stderr())

    last_reported_progress = 0
    last_reported_time = time.time()

    async def send_progress_update(prog: int, msg: str):
        nonlocal last_reported_progress, last_reported_time
        last_reported_progress = prog
        last_reported_time = time.time()

        activity.heartbeat(f"rendering {prog}%")

        try:
            await update_task_status(
                TaskStatusUpdateParams(
                    resquest_info=params.resquest_info,
                    task_id=params.task_id,
                    task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS,
                    status=TASK_STATUS.STARTED,
                    progress=prog,
                    message=msg,
                )
            )
        except Exception as e:
            logger.warning(f"[video_synthesis] Failed to update task progress ({prog}%): {e}")

    # 仅在未配置自定义聚合回调时发出独立阶段更新
    if on_raw_progress is None:
        await send_progress_update(5, "Bundling and preparing video render...")

    try:
        async with asyncio.timeout(timeout_seconds):
            if process.stdout:
                while True:
                    line = await process.stdout.readline()
                    if not line:
                        break
                    line_str = line.decode("utf-8", errors="ignore").strip()
                    if not line_str:
                        continue
                    try:
                        data = json.loads(line_str)
                        if isinstance(data, dict) and "progress" in data:
                            raw_prog = float(data.get("progress", 0))
                            if on_raw_progress is not None:
                                await on_raw_progress(raw_prog)
                            else:
                                mapped_prog = min(90, max(5, int(5 + raw_prog * 85)))
                                now = time.time()
                                if mapped_prog >= last_reported_progress + 2 or (
                                    now - last_reported_time >= 2 and mapped_prog > last_reported_progress
                                ):
                                    await send_progress_update(mapped_prog, f"Rendering video ({mapped_prog}%)")
                    except (json.JSONDecodeError, ValueError, TypeError):
                        stdout_tail.append(line_str)

            await process.wait()
            await stderr_task
    except (CancelledError, asyncio.CancelledError):
        logger.info(f"[video_synthesis] Task {params.task_id} was cancelled, terminating process group...")
        _kill_process_group(process)
        raise
    except TimeoutError:
        logger.warning(
            f"[video_synthesis] Task {params.task_id} timed out after {timeout_seconds}s, terminating process group..."
        )
        _kill_process_group(process)
        raise RuntimeError(f"Video rendering timed out after {timeout_seconds} seconds")

    if process.returncode != 0:
        err_detail = "\n".join([*stdout_tail, *stderr_lines]).strip()
        raise RuntimeError(f"Video rendering failed (exit code {process.returncode}): {err_detail}")

    if not os.path.exists(output_video_path):
        err_detail = "\n".join([*stdout_tail, *stderr_lines]).strip()
        raise RuntimeError(f"Video output file not found: {output_video_path}. Output: {err_detail}")


class LocalAssetServer:
    """启动本地轻量级 127.0.0.1 HTTP 资源服务，解决 Remotion file:// 协议限制"""

    def __init__(self, assets_dir: str):
        self.assets_dir = assets_dir
        self.server: socketserver.TCPServer | None = None
        self.thread: threading.Thread | None = None
        self.port: int = 0

    def start(self) -> int:
        assets_dir = self.assets_dir

        class QuietHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
            def log_message(self, format, *args):
                pass

        def handler(*args, **kwargs):
            return QuietHTTPRequestHandler(*args, directory=assets_dir, **kwargs)

        self.server = socketserver.TCPServer(("127.0.0.1", 0), handler)
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        return self.port

    def stop(self):
        if self.server:
            try:
                self.server.shutdown()
                self.server.server_close()
            except Exception:
                pass


async def _preload_remote_assets(input_dict: dict, assets_dir: str, local_port: int) -> dict:
    """预下载所有远程 HTTP/HTTPS 音视频与图片资源到本地 workspace，并通过本地 127.0.0.1 HTTP 服务映射给 Remotion"""
    os.makedirs(assets_dir, exist_ok=True)
    urls_to_download: dict[str, str] = {}

    def register_url(url: str | None):
        if url and isinstance(url, str) and (url.startswith("http://") or url.startswith("https://")):
            # 本服务对象存储 URL（容器内 domain 是 localhost/入口域名） 需要预下载；
            # 已经指向本地资源服务的 URL 直接跳过
            if not storage_object_name(url) and parse.urlsplit(url).hostname in ("127.0.0.1", "localhost"):
                return
            if url not in urls_to_download:
                url_clean = url.split("?")[0]
                ext = os.path.splitext(url_clean)[1] or ".tmp"
                filename = f"asset_{uuid4()}{ext}"
                urls_to_download[url] = os.path.join(assets_dir, filename)

    # 1. 收集所有字幕音频 URL
    scenes = input_dict.get("scenes") or {}
    intro_scene = scenes.get("question_introduction") or {}
    for sub in intro_scene.get("subtitles") or []:
        if isinstance(sub, dict):
            register_url(sub.get("audio"))

    sol_scene = scenes.get("question_solution") or {}
    for seg in sol_scene.get("segments") or []:
        if isinstance(seg, dict):
            for sub in seg.get("subtitles") or []:
                if isinstance(sub, dict):
                    register_url(sub.get("audio"))

    kp_scene = scenes.get("question_key_points") or {}
    for seg in kp_scene.get("segments") or []:
        if isinstance(seg, dict):
            for sub in seg.get("subtitles") or []:
                if isinstance(sub, dict):
                    register_url(sub.get("audio"))

    # 2. 收集片头片尾背景水印等资源 URL
    vs = input_dict.get("video_settings") or {}
    if isinstance(vs, dict):
        register_url(vs.get("background"))
        register_url(vs.get("opening_film"))
        register_url(vs.get("closing_film"))
        register_url(vs.get("watermark"))

    if not urls_to_download:
        return input_dict

    logger.info(
        f"[video_synthesis] Preloading {len(urls_to_download)} remote assets locally for 127.0.0.1:{local_port}..."
    )

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:

        async def download_one(url: str, local_path: str):
            try:
                if storage_object_name(url):
                    # 本服务对象存储 URL 在容器内不可达，改从内网 MinIO 读取
                    content = (await download_file(url)).content
                else:
                    resp = await client.get(url)
                    if resp.status_code != 200:
                        return
                    content = resp.content
                async with aiofiles.open(local_path, "wb") as f:
                    await f.write(content)
            except Exception as e:
                logger.warning(f"[video_synthesis] Failed to download asset {url}: {e}")

        await asyncio.gather(*[download_one(url, path) for url, path in urls_to_download.items()])

    # 3. 构造替换映射 table：指向本地 127.0.0.1 轻量级 HTTP 服务
    url_map = {
        url: f"http://127.0.0.1:{local_port}/{os.path.basename(path)}"
        if os.path.exists(path) and os.path.getsize(path) > 0
        else url
        for url, path in urls_to_download.items()
    }

    def replace_url(url: str | None) -> str | None:
        return url_map.get(url, url) if url else url

    # 4. 替换 JSON 字典中的 URL 引用
    if "scenes" in input_dict and isinstance(input_dict["scenes"], dict):
        scenes_data = input_dict["scenes"]
        if "question_introduction" in scenes_data and isinstance(scenes_data["question_introduction"], dict):
            for sub in scenes_data["question_introduction"].get("subtitles") or []:
                if isinstance(sub, dict) and "audio" in sub:
                    sub["audio"] = replace_url(sub["audio"])

        for scene_key in ["question_solution", "question_key_points"]:
            if scene_key in scenes_data and isinstance(scenes_data[scene_key], dict):
                for seg in scenes_data[scene_key].get("segments") or []:
                    if isinstance(seg, dict):
                        for sub in seg.get("subtitles") or []:
                            if isinstance(sub, dict) and "audio" in sub:
                                sub["audio"] = replace_url(sub["audio"])

    if "video_settings" in input_dict and isinstance(input_dict["video_settings"], dict):
        vs_data = input_dict["video_settings"]
        for k in ["background", "opening_film", "closing_film", "watermark"]:
            if k in vs_data:
                vs_data[k] = replace_url(vs_data[k])

    return input_dict


async def _concat_videos(video_paths: list[str], output_video_path: str) -> None:
    """使用 FFmpeg concat demuxer (-c copy) 零损耗秒级合并分段视频"""
    if not video_paths:
        raise ValueError("No video paths provided for concatenation")
    if len(video_paths) == 1:
        if video_paths[0] != output_video_path:
            os.rename(video_paths[0], output_video_path)
        return

    dir_path = os.path.dirname(output_video_path)
    concat_txt_path = os.path.join(dir_path, f"concat_{uuid4()}.txt")

    async with aiofiles.open(concat_txt_path, "w", encoding="utf-8") as f:
        for p in video_paths:
            safe_p = p.replace("'", "'\\''")
            await f.write(f"file '{safe_p}'\n")

    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_txt_path, "-c", "copy", output_video_path]

    proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    _, stderr = await proc.communicate()

    if os.path.exists(concat_txt_path):
        try:
            os.remove(concat_txt_path)
        except Exception:
            pass

    if proc.returncode != 0 or not os.path.exists(output_video_path):
        raise RuntimeError(
            f"FFmpeg video concatenation failed (code {proc.returncode}): {stderr.decode('utf-8', errors='ignore')}"
        )


def _split_preloaded_scenes(input_dict: dict, target_chunks: int = 4) -> list[dict]:
    """按【音频时间/毫秒数】平滑四等分（或 target_chunks 等分）视频内容，生成绝佳负载均衡的切片 List"""
    scenes = input_dict.get("scenes") or {}
    intro = scenes.get("question_introduction") or {}
    solution = scenes.get("question_solution") or {}
    key_points = scenes.get("question_key_points") or {}

    # 1. 扁平化收集所有带时间的条目 (SceneType, Segment/Data, duration)
    items: list[dict] = []
    total_duration = 0

    for sub in intro.get("subtitles") or []:
        dur = sub.get("duration", 0) if isinstance(sub, dict) else 0
        items.append({"type": "intro_subtitle", "data": sub, "duration": dur})
        total_duration += dur

    for seg in solution.get("segments") or []:
        if isinstance(seg, dict):
            for sub in seg.get("subtitles") or []:
                dur = sub.get("duration", 0) if isinstance(sub, dict) else 0
                items.append(
                    {
                        "type": "solution_subtitle",
                        "seg_title": seg.get("title", ""),
                        "seg_content": seg.get("content", ""),
                        "data": sub,
                        "duration": dur,
                    }
                )
                total_duration += dur

    for seg in key_points.get("segments") or []:
        if isinstance(seg, dict):
            for sub in seg.get("subtitles") or []:
                dur = sub.get("duration", 0) if isinstance(sub, dict) else 0
                items.append(
                    {
                        "type": "key_points_subtitle",
                        "seg_title": seg.get("title", ""),
                        "seg_content": seg.get("content", ""),
                        "data": sub,
                        "duration": dur,
                    }
                )
                total_duration += dur

    if total_duration <= 0 or len(items) <= 1 or target_chunks <= 1:
        return [input_dict]

    # 2. 根据总时长与 target_chunks 计算每个切片的理想目标时长 (target_dur)
    target_dur = total_duration / target_chunks
    chunk_items_list: list[list[dict]] = [[] for _ in range(target_chunks)]
    curr_chunk_idx = 0
    curr_chunk_dur = 0

    for item in items:
        # 当当前 Chunk 累积时长达到 target_dur，且不是最后一个 Chunk 时，切入下一个
        if (
            curr_chunk_dur >= target_dur
            and curr_chunk_idx < target_chunks - 1
            and len(chunk_items_list[curr_chunk_idx]) > 0
        ):
            curr_chunk_idx += 1
            curr_chunk_dur = 0

        chunk_items_list[curr_chunk_idx].append(item)
        curr_chunk_dur += item["duration"]

    # 移除可能为空的 chunk
    active_chunk_items = [c for c in chunk_items_list if len(c) > 0]
    if len(active_chunk_items) <= 1:
        return [input_dict]

    # 3. 将打散的时间线条目组装回标准的 input_dict JSON 格式
    chunks = []
    stem = intro.get("stem", "")
    options = intro.get("options", [])

    for idx, c_items in enumerate(active_chunk_items):
        intro_subs = [it["data"] for it in c_items if it["type"] == "intro_subtitle"]

        # 组装 Solution Segments
        sol_seg_map: dict[tuple[str, str], list] = {}
        for it in c_items:
            if it["type"] == "solution_subtitle":
                key = (it["seg_title"], it["seg_content"])
                if key not in sol_seg_map:
                    sol_seg_map[key] = []
                sol_seg_map[key].append(it["data"])

        sol_segments = [{"title": k[0], "content": k[1], "subtitles": subs} for k, subs in sol_seg_map.items()]

        # 组装 KeyPoints Segments
        kp_seg_map: dict[tuple[str, str], list] = {}
        for it in c_items:
            if it["type"] == "key_points_subtitle":
                key = (it["seg_title"], it["seg_content"])
                if key not in kp_seg_map:
                    kp_seg_map[key] = []
                kp_seg_map[key].append(it["data"])

        kp_segments = [{"title": k[0], "content": k[1], "subtitles": subs} for k, subs in kp_seg_map.items()]

        chunk_dict = {
            "question_metadata": input_dict.get("question_metadata"),
            "question_content": input_dict.get("question_content"),
            "scenes": {
                "question_introduction": {
                    "stem": stem,
                    "options": options,
                    "subtitles": intro_subs,
                },
                "question_solution": {"segments": sol_segments},
                "question_key_points": {"segments": kp_segments},
            },
            "video_settings": dict(input_dict.get("video_settings") or {}),
        }

        # 仅第一个 Chunk 保留片头，仅最后一个 Chunk 保留片尾
        vs = chunk_dict["video_settings"]
        if idx == 0:
            vs["closing_film"] = ""
        elif idx == len(active_chunk_items) - 1:
            vs["opening_film"] = ""
        else:
            vs["opening_film"] = ""
            vs["closing_film"] = ""

        chunks.append(chunk_dict)

    return chunks


@activity.defn
async def video_synthesis(params: VideoSynthesisParams) -> VideoSynthesisResult:
    try:
        await update_task_status(
            TaskStatusUpdateParams(
                resquest_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS,
                status=TASK_STATUS.STARTED,
                progress=5,
                message="合成节点已分配，开始准备渲染...",
            )
        )
    except Exception as e:
        logger.warning(f"[video_synthesis] Failed to update initial activity task status: {e}")

    with tempfile.TemporaryDirectory() as workspace:
        assets_dir = os.path.join(workspace, "assets")
        asset_server = LocalAssetServer(assets_dir)
        local_port = asset_server.start()

        try:
            # 1. 构建 Remotion 输入 JSON
            remotion_input = RemotionScriptInput(
                **params.video_script_desc.model_dump(),
                video_settings=params.video_export_desc,
            )

            # 预下载公网音视频资源到本地 workspace 磁盘，并通过 127.0.0.1 零延迟 HTTP 服务透传给 Remotion
            input_dict = remotion_input.model_dump()
            preloaded_dict = await _preload_remote_assets(input_dict, assets_dir, local_port)

            concurrency = config.tasks.question_explanation_video_gen_synthesis.render_max_concurrency
            if not concurrency or concurrency <= 0:
                concurrency = get_cpu_count()

            target_parallel_chunks = getattr(
                config.tasks.question_explanation_video_gen_synthesis, "render_parallel_chunks", 4
            )
            if not target_parallel_chunks or target_parallel_chunks <= 0:
                target_parallel_chunks = 4

            # 2. 按音频时间将全视频平滑四等分（Map-Reduce 并行渲染）
            chunks = _split_preloaded_scenes(preloaded_dict, target_chunks=target_parallel_chunks)

            output_video_path = os.path.join(workspace, f"output_{params.resquest_info.user_id}_{uuid4()}.mp4")

            if len(chunks) == 1:
                input_json_path = os.path.join(workspace, f"video_script_{params.resquest_info.user_id}_{uuid4()}.json")
                async with aiofiles.open(input_json_path, "w", encoding="utf-8") as f:
                    await f.write(json.dumps(chunks[0], ensure_ascii=False))

                logger.debug(f"[video_synthesis] rendering single scene video with concurrency {concurrency}")
                await _render_video_async(
                    input_json_path,
                    output_video_path,
                    concurrency,
                    workspace,
                    params.video_export_desc,
                    params,
                )
            else:
                logger.info(f"[video_synthesis] Splitting video into {len(chunks)} parallel scene chunks...")
                chunk_tasks = []
                chunk_video_paths = []
                # 使用 Lock + 数组聚合多 chunk 的并行渲染进度，保证全局 Task progress 单调递增 (5% -> 90%)
                chunk_progresses = [0.0] * len(chunks)
                progress_lock = asyncio.Lock()
                last_reported_mapped_prog = 5

                async def report_aggregated_progress():
                    nonlocal last_reported_mapped_prog
                    async with progress_lock:
                        avg_raw_prog = sum(chunk_progresses) / len(chunks)
                        mapped_prog = min(90, max(5, int(5 + avg_raw_prog * 85)))
                        if mapped_prog > last_reported_mapped_prog:
                            last_reported_mapped_prog = mapped_prog
                            activity.heartbeat(f"rendering {mapped_prog}%")
                            try:
                                await update_task_status(
                                    TaskStatusUpdateParams(
                                        resquest_info=params.resquest_info,
                                        task_id=params.task_id,
                                        task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS,
                                        status=TASK_STATUS.STARTED,
                                        progress=mapped_prog,
                                        message=f"Rendering video ({mapped_prog}%)",
                                    )
                                )
                            except Exception as e:
                                logger.warning(
                                    f"[video_synthesis] Failed to update aggregated task progress ({mapped_prog}%): {e}"
                                )

                per_chunk_concurrency = max(2, concurrency // len(chunks))

                for idx, chunk_data in enumerate(chunks):
                    c_json_path = os.path.join(workspace, f"chunk_{idx}_{uuid4()}.json")
                    c_video_path = os.path.join(workspace, f"chunk_{idx}_{uuid4()}.mp4")
                    async with aiofiles.open(c_json_path, "w", encoding="utf-8") as f:
                        await f.write(json.dumps(chunk_data, ensure_ascii=False))

                    chunk_video_paths.append(c_video_path)

                    def make_progress_cb(chunk_idx: int):
                        async def chunk_prog_cb(raw_prog: float):
                            chunk_progresses[chunk_idx] = raw_prog
                            await report_aggregated_progress()

                        return chunk_prog_cb

                    chunk_tasks.append(
                        _render_video_async(
                            c_json_path,
                            c_video_path,
                            per_chunk_concurrency,
                            workspace,
                            params.video_export_desc,
                            params,
                            on_raw_progress=make_progress_cb(idx),
                        )
                    )

                # 并发渲染所有场景片段
                await asyncio.gather(*chunk_tasks)

                # FFmpeg 秒级无损拼接分段视频
                await _concat_videos(chunk_video_paths, output_video_path)
        finally:
            asset_server.stop()

        # 4. 上传视频阶段 (更新进度为 95%)
        try:
            activity.heartbeat("uploading 95%")
            await update_task_status(
                TaskStatusUpdateParams(
                    resquest_info=params.resquest_info,
                    task_id=params.task_id,
                    task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS,
                    status=TASK_STATUS.STARTED,
                    progress=95,
                    message="Uploading generated video...",
                )
            )
        except Exception as e:
            logger.warning(f"[video_synthesis] Failed to update upload progress: {e}")

        # 5. 上传视频并返回 URL
        url = await upload_file(
            user_id=params.resquest_info.user_id,
            task_id=params.task_id,
            file_name=f"{uuid4()}.mp4",
            file_path=output_video_path,
        )
        return VideoSynthesisResult(video_url=url)
