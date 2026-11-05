import { useRenderSettingsStore } from "@/store/render-settings-store"
import type { FeScene } from "@ask2vid/shared"
import { resolveDimension, VideoComposition } from "@ask2vid/shared"
import { Player, type PlayerRef } from "@remotion/player"
import { useEffect, useMemo, useState } from "react"
import { useShallow } from "zustand/shallow"
import { ShareController } from "./components/share-controller"

interface SharePlayerProps {
  durationInFrames: number
  scenes: FeScene[]
  playerRef: React.RefObject<PlayerRef | null>
  title?: string
}

function useBrowserVideoDuration(url: string): number | null {
  const [state, setState] = useState<{ url: string; val: number | null }>({
    url: "",
    val: null,
  })

  useEffect(() => {
    if (!url) return
    let cancelled = false
    const video = document.createElement("video")
    video.preload = "metadata"
    video.crossOrigin = "anonymous"
    const timeout = setTimeout(() => {
      if (!cancelled) setState({ url, val: null })
    }, 10_000)
    video.onloadedmetadata = () => {
      clearTimeout(timeout)
      if (!cancelled && video.duration && isFinite(video.duration)) {
        setState({ url, val: video.duration })
      }
    }
    video.onerror = () => {
      clearTimeout(timeout)
      if (!cancelled) setState({ url, val: null })
    }
    video.src = url
    return () => {
      cancelled = true
      clearTimeout(timeout)
      video.removeAttribute("src")
      video.load()
    }
  }, [url])

  if (state.url !== url) return null
  return state.val
}

function useFilmFrames(url: string | undefined, fps: number): number {
  const secs = useBrowserVideoDuration(url ?? "")
  if (!url || secs == null) return 0
  return Math.floor(secs * fps)
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

export function SharePlayer({
  durationInFrames,
  scenes,
  playerRef,
  title,
}: SharePlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  const storeSettings = useRenderSettingsStore(
    useShallow((s) => ({
      resolution: s.resolution,
      background: s.background,
      opening_film: s.opening_film,
      closing_film: s.closing_film,
      watermark: s.watermark,
      fps: s.fps,
      page_layout: s.page_layout,
    }))
  )

  const dimensions = resolveDimension(storeSettings.resolution)
  const introFrames = useFilmFrames(
    storeSettings.opening_film || undefined,
    storeSettings.fps
  )
  const outroFrames = useFilmFrames(
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
      speed: playbackRate,
      page_layout: storeSettings.page_layout,
      opening_film_duration_frames: introFrames,
      closing_film_duration_frames: outroFrames,
    }),
    [dimensions, storeSettings, introFrames, outroFrames, playbackRate]
  )

  const inputProps = useMemo(
    () => ({ scenes, renderSettings }),
    [scenes, renderSettings]
  )

  const totalDuration = durationInFrames + introFrames + outroFrames

  useEffect(() => {
    const { current } = playerRef
    if (!current) return
    const handler = (e: { detail: { isFullscreen: boolean } }) => {
      setIsFullscreen(e.detail.isFullscreen)
    }
    current.addEventListener("fullscreenchange", handler)
    return () => {
      current.removeEventListener("fullscreenchange", handler)
    }
  }, [playerRef])

  return (
    <div className="flex h-full flex-col">
      {title && (
        <div className="flex h-12 shrink-0 items-center px-4">
          <h2 className="text-sm font-medium">{title}</h2>
        </div>
      )}
      <div className="3xl:max-w-[105rem] mx-auto flex w-full max-w-6xl flex-1 flex-col p-4 xl:max-w-7xl 2xl:max-w-[90rem]">
        <div className="flex flex-col rounded-lg bg-muted" data-no-translate>
          <Player
            ref={playerRef}
            compositionWidth={dimensions.width}
            compositionHeight={dimensions.height}
            fps={storeSettings.fps}
            durationInFrames={totalDuration}
            playbackRate={playbackRate}
            inputProps={inputProps}
            component={VideoComposition}
            style={{
              width: "100%",
              borderRadius: "0.5rem",
            }}
            controls={isFullscreen}
            clickToPlay
          />
          <ShareController
            playerRef={playerRef}
            durationInFrames={totalDuration}
            fps={storeSettings.fps}
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
            playbackRates={[...PLAYBACK_RATES]}
          />
        </div>
      </div>
    </div>
  )
}
