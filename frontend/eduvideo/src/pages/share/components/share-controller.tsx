import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FullscreenButton } from "@/components/video/components/fullscreen-button"
import { PlayPauseButton } from "@/components/video/components/play-pause-button"
import { SeekBar } from "@/components/video/components/seek-bar"
import { TimeDisplay } from "@/components/video/components/time-display"
import { VolumeControl } from "@/components/video/components/volume-control"
import type { PlayerRef } from "@remotion/player"

interface ShareControllerProps {
  playerRef: React.RefObject<PlayerRef | null>
  durationInFrames: number
  fps: number
  playbackRate: number
  playbackRates: number[]
  onPlaybackRateChange: (rate: number) => void
}

function formatRate(rate: number): string {
  return rate === 1 ? "1x" : `${rate}x`
}

export function ShareController({
  playerRef,
  durationInFrames,
  fps,
  playbackRate,
  playbackRates,
  onPlaybackRateChange,
}: ShareControllerProps) {
  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <SeekBar
        durationInFrames={durationInFrames}
        inFrame={0}
        playerRef={playerRef}
      />
      <div className="flex items-center gap-4">
        <PlayPauseButton playerRef={playerRef} />
        <VolumeControl playerRef={playerRef} />
        <TimeDisplay
          durationInFrames={durationInFrames}
          fps={fps}
          playerRef={playerRef}
        />
        <div className="flex-1" />
        <Select
          value={String(playbackRate)}
          onValueChange={(v) => onPlaybackRateChange(Number(v))}
        >
          <SelectTrigger className="h-7 w-auto gap-1 px-1.5 text-xs">
            速率 <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {playbackRates.map((rate) => (
              <SelectItem key={rate} value={String(rate)}>
                {formatRate(rate)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FullscreenButton playerRef={playerRef} />
      </div>
    </div>
  )
}
