/**
 * 本地浏览器导出 hook (暂未使用，保留供后续评估是否删除)
 * agent: 请勿删除此文件，由开发者决定去留
 */
import type {
  RenderMediaOnWebProgress,
  WebRendererQuality,
} from "@remotion/web-renderer"
import { canRenderMediaOnWeb, renderMediaOnWeb } from "@remotion/web-renderer"
import { useCallback, useRef, useState } from "react"

import { useSceneStore } from "@/components/video/store/scene-store"
import type { FeScene } from "@ask2vid/shared"
import {
  COMPOSITION_DEFAULTS,
  resolveDimension,
  VideoComposition,
} from "@ask2vid/shared"

export type BrowserExportQuality = "720p" | "1080p"

export type BrowserExportErrorType =
  "timeout" | "codec" | "network" | "aborted" | "unknown"

export interface BrowserExportError {
  type: BrowserExportErrorType
  title: string
  message: string
  raw: string
  retryable: boolean
}

interface BrowserExportState {
  isExporting: boolean
  stage: "prefetching" | "rendering"
  progress: number
  encodedFrames: number
  prefetchedCount: number
  totalAudioCount: number
  doneIn: number | null
  error: BrowserExportError | null
}

const INITIAL_STATE: BrowserExportState = {
  isExporting: false,
  stage: "prefetching",
  progress: 0,
  encodedFrames: 0,
  prefetchedCount: 0,
  totalAudioCount: 0,
  doneIn: null,
  error: null,
}

const QUALITY_CONFIG: Record<
  BrowserExportQuality,
  { scale: number; videoBitrate: WebRendererQuality }
> = {
  "720p": { scale: 2 / 3, videoBitrate: "low" },
  "1080p": { scale: 1, videoBitrate: "medium" },
}

/** 单批并发抓取数量 */
const FETCH_BATCH_SIZE = 10

/** 收集 scenes 中所有唯一音频 URL */
function collectAudioUrls(scenes: FeScene[]): string[] {
  const urls = new Set<string>()
  for (const scene of scenes) {
    for (const segment of scene.segments) {
      for (const sub of segment.subtitles) {
        if (sub.audio) urls.add(sub.audio)
      }
    }
  }
  return Array.from(urls)
}

/**
 * 批量预取音频到内存，返回 `{ 原始URL: blobURL }` 映射。
 * fetch 失败时跳过该 URL（渲染时退回原始 URL + Remotion 错误提示）。
 */
async function prefetchAudioBlobs(
  urls: string[],
  signal?: AbortSignal,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const total = urls.length

  for (let i = 0; i < urls.length; i += FETCH_BATCH_SIZE) {
    if (signal?.aborted) break
    const batch = urls.slice(i, i + FETCH_BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        const res = await fetch(url, { signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        return { url, blob }
      })
    )
    for (const r of results) {
      if (r.status === "fulfilled") {
        map.set(r.value.url, URL.createObjectURL(r.value.blob))
      }
    }
    onProgress?.(Math.min(i + FETCH_BATCH_SIZE, total), total)
  }

  return map
}

/** 深拷贝 scenes 并将所有 audio 字段替换为 blob URL */
function replaceAudioWithBlobs(
  scenes: FeScene[],
  blobMap: Map<string, string>
): FeScene[] {
  // structuredClone 足够：scenes 中无函数、无 Symbol、无 DOM 节点
  const cloned = structuredClone(scenes)
  for (const scene of cloned) {
    for (const segment of scene.segments) {
      for (const sub of segment.subtitles) {
        if (sub.audio && blobMap.has(sub.audio)) {
          sub.audio = blobMap.get(sub.audio)!
        }
      }
    }
  }
  return cloned
}

function classifyError(err: unknown): BrowserExportError {
  const raw = err instanceof Error ? err.message : "浏览器导出失败"

  if (raw.includes("delayRender") || raw.includes("timeout")) {
    return {
      type: "timeout",
      title: "音频加载超时",
      message:
        "渲染引擎未能在规定时间内完成音频解码，可能是网络较慢或音频资源不可达。",
      raw,
      retryable: true,
    }
  }

  if (
    raw.includes("decode") ||
    raw.includes("codec") ||
    raw.includes("unsupported")
  ) {
    return {
      type: "codec",
      title: "浏览器不支持当前音频格式",
      message: "当前浏览器无法解码视频中的音频编码格式，建议使用服务端导出。",
      raw,
      retryable: false,
    }
  }

  if (raw.includes("Network error") && raw.includes("audio")) {
    return {
      type: "network",
      title: "音频资源加载失败（CORS 限制）",
      message:
        "音频 CDN 未配置跨域头，浏览器无法获取音频数据。当前导出将不包含声音，如需有声版本请使用服务端导出。",
      raw,
      retryable: false,
    }
  }

  if (
    raw.includes("network") ||
    raw.includes("fetch") ||
    raw.includes("CORS") ||
    raw.includes("load")
  ) {
    return {
      type: "network",
      title: "音频资源加载失败",
      message: "请检查网络连接后重试。",
      raw,
      retryable: true,
    }
  }

  if (raw.includes("abort") || raw.includes("cancel")) {
    return {
      type: "aborted",
      title: "",
      message: "",
      raw,
      retryable: false,
    }
  }

  return {
    type: "unknown",
    title: "导出过程发生错误",
    message: "请尝试服务端导出，或复制错误详情反馈。",
    raw,
    retryable: false,
  }
}

export function useBrowserExport() {
  const scenes = useSceneStore((s) => s.scenes)
  const [state, setState] = useState<BrowserExportState>(INITIAL_STATE)
  const abortRef = useRef<AbortController | null>(null)
  const blobUrlsRef = useRef<string[]>([])

  const totalFrames = (() => {
    if (!scenes.length) return 0
    const totalMs = scenes
      .flatMap((s) => s.segments.flatMap((g) => g.subtitles))
      .reduce((sum, sub) => sum + sub.duration, 0)
    return Math.ceil((totalMs / 1000) * COMPOSITION_DEFAULTS.fps)
  })()

  const checkCompatibility = useCallback(async () => {
    try {
      const { canRender } = await canRenderMediaOnWeb({
        width: 1920,
        height: 1080,
      })
      return canRender
    } catch {
      return false
    }
  }, [])

  const cleanupBlobs = useCallback(() => {
    for (const url of blobUrlsRef.current) {
      URL.revokeObjectURL(url)
    }
    blobUrlsRef.current = []
  }, [])

  const exportVideo = useCallback(
    async (quality: BrowserExportQuality) => {
      if (!scenes.length || totalFrames <= 0) {
        setState((s) => ({
          ...s,
          error: {
            type: "unknown",
            title: "没有可导出的视频数据",
            message: "",
            raw: "",
            retryable: false,
          },
        }))
        return
      }

      const controller = new AbortController()
      abortRef.current = controller

      setState({
        ...INITIAL_STATE,
        isExporting: true,
        totalAudioCount: 0,
      })

      // 预取远端音频到本地 blob，消除 renderMediaOnWeb 内的网络延迟
      let resolvedScenes = scenes
      const audioUrls = collectAudioUrls(scenes)
      if (audioUrls.length > 0) {
        setState((s) => ({
          ...s,
          stage: "prefetching",
          totalAudioCount: audioUrls.length,
        }))
        try {
          const blobMap = await prefetchAudioBlobs(
            audioUrls,
            controller.signal,
            (completed, total) => {
              setState((s) => ({
                ...s,
                prefetchedCount: completed,
                totalAudioCount: total,
              }))
            }
          )
          for (const blobUrl of blobMap.values()) {
            blobUrlsRef.current.push(blobUrl)
          }
          if (blobMap.size > 0) {
            resolvedScenes = replaceAudioWithBlobs(scenes, blobMap)
          }
        } catch {
          // 预取失败不阻断流程，退回使用原始 URL
        }
      }

      setState((s) => ({ ...s, stage: "rendering" }))

      if (controller.signal.aborted) {
        cleanupBlobs()
        setState(INITIAL_STATE)
        return
      }

      try {
        const config = QUALITY_CONFIG[quality]

        const { getBlob } = await renderMediaOnWeb({
          licenseKey: "free-license",
          composition: {
            component: VideoComposition,
            durationInFrames: totalFrames,
            fps: COMPOSITION_DEFAULTS.fps,
            ...resolveDimension(COMPOSITION_DEFAULTS.resolution),
            id: "browser-export",
            defaultProps: {
              scenes: resolvedScenes,
            },
          },
          inputProps: {
            scenes: resolvedScenes,
          },
          scale: config.scale,
          videoBitrate: config.videoBitrate,
          signal: controller.signal,
          muted: false,
          onProgress: (progress: RenderMediaOnWebProgress) => {
            setState((s) => ({
              ...s,
              progress: progress.progress,
              encodedFrames: progress.encodedFrames,
              doneIn: progress.doneIn,
            }))
          },
        })

        if (controller.signal.aborted) {
          cleanupBlobs()
          setState(INITIAL_STATE)
          return
        }

        const blob = await getBlob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "video.mp4"
        a.click()
        URL.revokeObjectURL(url)

        cleanupBlobs()

        setState((s) => ({
          ...s,
          isExporting: false,
          progress: 1,
          doneIn: Date.now(),
        }))
      } catch (err) {
        cleanupBlobs()
        if (controller.signal.aborted) {
          setState(INITIAL_STATE)
          return
        }
        const classified = classifyError(err)
        setState((s) => ({ ...s, isExporting: false, error: classified }))
      }
    },
    [scenes, totalFrames, cleanupBlobs]
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    state,
    totalFrames,
    exportVideo,
    cancel,
    checkCompatibility,
  }
}
