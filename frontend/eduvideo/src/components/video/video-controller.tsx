import type { PlayerRef } from "@remotion/player"
import type { ReactNode } from "react"

import { FullscreenButton } from "./components/fullscreen-button"
import { PlayPauseButton } from "./components/play-pause-button"
import { SeekBar } from "./components/seek-bar"
import { TimeDisplay } from "./components/time-display"
import { VolumeControl } from "./components/volume-control"

interface VideoControllerProps {
  playerRef: React.RefObject<PlayerRef | null>
  durationInFrames: number
  fps: number
  inFrame?: number
  outFrame?: number
  controllerActions?: ReactNode
}

/**
 * 视频播放控制器
 * - SeekBar 进度条
 * - PlayPauseButton 播放/暂停按钮
 * - VolumeControl 音量控制
 * - TimeDisplay 时间显示
 * - FullscreenButton 全屏按钮
 */
export function VideoController({
  playerRef,
  durationInFrames,
  fps,
  inFrame = 0,
  outFrame,
  controllerActions,
}: VideoControllerProps) {
  return (
    <div className="flex w-full flex-col gap-2 p-4">
      {/* 进度条 */}
      <SeekBar
        durationInFrames={durationInFrames}
        inFrame={inFrame}
        outFrame={outFrame}
        playerRef={playerRef}
      />

      {/* 控制栏 */}
      <div className="flex items-center gap-4">
        {/* 播放/暂停按钮 */}
        <PlayPauseButton playerRef={playerRef} />

        {/* 音量控制 */}
        <VolumeControl playerRef={playerRef} />

        {/* 时间显示 */}
        <TimeDisplay
          durationInFrames={durationInFrames}
          fps={fps}
          playerRef={playerRef}
        />

        {/* 控制器插槽 */}
        <div className="flex-1">{controllerActions}</div>

        {/* 全屏按钮 */}
        <FullscreenButton playerRef={playerRef} />
      </div>
    </div>
  )
}
