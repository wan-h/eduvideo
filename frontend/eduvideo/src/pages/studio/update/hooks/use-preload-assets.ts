import type { FeVideoData } from "@ask2vid/shared"
import { BACKGROUND_IMAGE_MAP, COMPOSITION_DEFAULTS } from "@ask2vid/shared"
import { preloadAudio, preloadImage } from "@remotion/preload"
import { useEffect, useRef } from "react"
import { staticFile } from "remotion"

/** 每次并发预加载的数量 */
const BATCH_SIZE = 6

/**
 * 判断 URL 是否跨域。
 * @remotion/preload 的 preloadAudio 内部会 fetch() 检查重定向，
 * 跨域资源若无 CORS 头会导致 fetch 失败并在控制台输出噪音。
 * 对跨域 URL 直接使用原生 <audio preload="auto"> 绕过此问题。
 */
function isCrossOrigin(url: string): boolean {
  try {
    const target = new URL(url)
    return target.origin !== window.location.origin
  } catch {
    return true // 无效 URL 视为跨域
  }
}

/**
 * 原生预加载：创建 <audio preload="auto"> 触发浏览器下载。
 * 适用跨域 URL，不检查 CORS 头，浏览器直接发起 GET 请求。
 */
function preloadAudioNative(url: string): () => void {
  const audio = document.createElement("audio")
  audio.preload = "auto"
  audio.src = url
  audio.hidden = true
  document.body.appendChild(audio)
  return () => {
    audio.pause()
    audio.removeAttribute("src")
    audio.load()
    audio.remove()
  }
}

/**
 * 数据就绪后预加载所有音频和图片资源，避免播放时因网络延迟导致卡顿。
 *
 * 策略：
 * - 同域音频：使用 @remotion/preload 的 preloadAudio
 * - 跨域音频：使用原生 <audio preload="auto">（绕过 preloadAudio 的 fetch 重定向检查）
 * - 图片：使用 preloadImage（本地文件不存在跨域问题）
 */
export function usePreloadAssets(videoData: FeVideoData | null) {
  const cleanupsRef = useRef<(() => void)[]>([])

  useEffect(() => {
    if (!videoData) return

    // 收集唯一音频 URL
    const audioUrls = new Set<string>()
    for (const scene of videoData.scenes) {
      for (const segment of scene.segments) {
        for (const subtitle of segment.subtitles) {
          if (subtitle.audio) {
            audioUrls.add(subtitle.audio)
          }
        }
      }
    }

    const urls = Array.from(audioUrls)
    const cleanups: (() => void)[] = []

    const crossOriginUrls: string[] = []
    const sameOriginUrls: string[] = []

    for (const url of urls) {
      if (isCrossOrigin(url)) {
        crossOriginUrls.push(url)
      } else {
        sameOriginUrls.push(url)
      }
    }

    if (crossOriginUrls.length > 0) {
      console.log(
        `[预加载] ${crossOriginUrls.length} 个跨域音频使用浏览器原生预加载`
      )
    }

    // 分批预加载
    async function preloadInBatches() {
      // 同域音频：通过 @remotion/preload
      for (let i = 0; i < sameOriginUrls.length; i += BATCH_SIZE) {
        const batch = sameOriginUrls.slice(i, i + BATCH_SIZE)
        for (const url of batch) {
          const unpreload = preloadAudio(url)
          cleanups.push(unpreload)
        }
        if (i + BATCH_SIZE < sameOriginUrls.length) {
          await new Promise((r) => setTimeout(r, 0))
        }
      }

      // 跨域音频：原生 <audio> 预加载
      for (let i = 0; i < crossOriginUrls.length; i += BATCH_SIZE) {
        const batch = crossOriginUrls.slice(i, i + BATCH_SIZE)
        for (const url of batch) {
          const unpreload = preloadAudioNative(url)
          cleanups.push(unpreload)
        }
        if (i + BATCH_SIZE < crossOriginUrls.length) {
          await new Promise((r) => setTimeout(r, 0))
        }
      }
    }

    preloadInBatches().then(() => {
      const total = sameOriginUrls.length + crossOriginUrls.length
      if (total > 0) {
        console.log(
          `[预加载] 完成: 共 ${total} 个音频 ` +
            `(同域 ${sameOriginUrls.length}, 跨域 ${crossOriginUrls.length})`
        )
      }
    })

    // 预加载背景图（本地文件，无跨域问题）
    try {
      const bgImage = COMPOSITION_DEFAULTS.background
      const unpreloadBg = preloadImage(
        staticFile(BACKGROUND_IMAGE_MAP[bgImage])
      )
      cleanups.push(unpreloadBg)
    } catch (err) {
      console.warn("[预加载] 背景图预加载失败:", err)
    }

    cleanupsRef.current = cleanups

    return () => {
      for (const cleanup of cleanupsRef.current) {
        cleanup()
      }
      cleanupsRef.current = []
    }
  }, [videoData])
}
