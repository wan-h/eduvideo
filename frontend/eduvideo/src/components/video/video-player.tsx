import { Player, type PlayerRef } from "@remotion/player"
import { useEffect, useMemo, useState, type ReactNode } from "react"

import type { FeScene } from "@ask2vid/shared"
import { resolveDimension, VideoComposition } from "@ask2vid/shared"
import { useShallow } from "zustand/shallow"

import { useDraftStore } from "@/store/draft-store"
import { useRenderSettingsStore } from "@/store/render-settings-store"

import { useKeyboardControls } from "./hooks/use-keyboard-controls"
import { useSegmentStore } from "./store/segment-store"
import { useSubtitleStore } from "./store/subtitle-store"
import { VideoController } from "./video-controller"

interface VideoPlayerProps {
  durationInFrames: number
  scenes: FeScene[]
  playerRef: React.RefObject<PlayerRef | null>
  segmentBar?: ReactNode
  controllerActions?: ReactNode
}

/** 使用浏览器原生 <video> 获取远程视频时长（秒），失败返回 null */
function getBrowserVideoDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.crossOrigin = "anonymous"
    const timeout = setTimeout(() => done(null), 10_000)
    const cleanup = () => {
      clearTimeout(timeout)
      video.removeAttribute("src")
      video.load()
    }
    const done = (value: number | null) => {
      cleanup()
      resolve(value)
    }
    video.onloadedmetadata = () => {
      done(video.duration && isFinite(video.duration) ? video.duration : null)
    }
    video.onerror = () => done(null)
    video.src = url
  })
}

function useFilmFrameDuration(url: string | undefined, fps: number): number {
  const [frames, setFrames] = useState<{ url: string; val: number }>({
    url: "",
    val: 0,
  })

  useEffect(() => {
    if (!url) return
    let cancelled = false
    getBrowserVideoDuration(url).then((secs) => {
      if (!cancelled) {
        setFrames({
          url,
          val: secs !== null ? Math.floor(secs * fps) : 0,
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [url, fps])

  // url 变化时旧值自动失效，避免 effect 中同步 setState
  if (frames.url !== url) return 0
  return frames.val
}

export function VideoPlayer({
  durationInFrames,
  scenes,
  playerRef,
  segmentBar,
  controllerActions,
}: VideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isEditingSegment = useSegmentStore((s) => s.isEditingSegment)
  const editingSubtitleId = useSubtitleStore((s) => s.editingSubtitleId)
  const isPlaybackBlocked = isEditingSegment || editingSubtitleId !== null

  const storeSettings = useRenderSettingsStore(
    useShallow((s) => {
      // Dialog 打开时读草稿 store，否则读正式 store；speed 始终来自正式 store
      const draftConfig = useDraftStore.getState().config
      const src = draftConfig ?? s
      return {
        resolution: src.resolution,
        background: src.background,
        opening_film: src.opening_film,
        closing_film: src.closing_film,
        watermark: src.watermark,
        fps: src.fps,
        speed: s.speed,
        page_layout: src.page_layout,
      }
    })
  )

  const dimensions = resolveDimension(storeSettings.resolution)

  // 浏览器端获取片头/片尾视频时长
  const introFrames = useFilmFrameDuration(
    storeSettings.opening_film || undefined,
    storeSettings.fps
  )
  const outroFrames = useFilmFrameDuration(
    storeSettings.closing_film || undefined,
    storeSettings.fps
  )

  const renderSettings = useMemo(
    () => ({
      width: dimensions.width,
      height: dimensions.height,
      background: storeSettings.background,
      opening_film: storeSettings.opening_film,
      closing_film: storeSettings.closing_film,
      watermark: storeSettings.watermark,
      fps: storeSettings.fps,
      speed: storeSettings.speed,
      page_layout: storeSettings.page_layout,
      opening_film_duration_frames: introFrames,
      closing_film_duration_frames: outroFrames,
    }),
    [dimensions, storeSettings, introFrames, outroFrames]
  )

  const inputProps = useMemo(
    () => ({ scenes, renderSettings }),
    [scenes, renderSettings]
  )

  const totalDuration = durationInFrames + introFrames + outroFrames

  // 监听 Player 全屏状态变化
  useEffect(() => {
    const { current } = playerRef
    if (!current) return

    const onFullscreenChange = (e: { detail: { isFullscreen: boolean } }) => {
      setIsFullscreen(e.detail.isFullscreen)
    }

    current.addEventListener("fullscreenchange", onFullscreenChange)
    return () => {
      current.removeEventListener("fullscreenchange", onFullscreenChange)
    }
  }, [playerRef])

  useKeyboardControls(playerRef)

  return (
    <div className="mb-4 flex flex-col rounded-lg bg-muted" data-no-translate>
      <Player
        ref={playerRef}
        compositionWidth={dimensions.width}
        compositionHeight={dimensions.height}
        fps={storeSettings.fps}
        durationInFrames={totalDuration}
        playbackRate={storeSettings.speed}
        inputProps={inputProps}
        component={VideoComposition}
        style={{
          width: "100%",
          borderRadius: "0.5rem",
        }}
        controls={isFullscreen}
        clickToPlay={!isPlaybackBlocked}
      />
      {segmentBar}
      <VideoController
        playerRef={playerRef}
        durationInFrames={totalDuration}
        fps={storeSettings.fps}
        controllerActions={controllerActions}
      />
    </div>
  )
}
