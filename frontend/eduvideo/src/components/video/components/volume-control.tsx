import { Volume2Icon, VolumeXIcon } from "lucide-react"
import { useRef, useState } from "react"

import { Slider } from "@/components/ui/slider"
import { cn } from "@/utils/cn"
import type { PlayerRef } from "@remotion/player"
import { usePlayerVolume } from "../hooks/use-player-volume"

/**
 * 音量控制组件
 * - 静音切换按钮
 * - Hover 时显示音量滑块
 */
export function VolumeControl({
  playerRef,
}: {
  playerRef: React.RefObject<PlayerRef | null>
}) {
  const { volume, isMuted, setVolume, toggleMute } = usePlayerVolume(playerRef)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const hideSliderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const handleVolumeChange = (values: number[]) => {
    setVolume(values[0] / 100)
  }

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => {
        if (hideSliderTimeoutRef.current) {
          clearTimeout(hideSliderTimeoutRef.current)
        }
        setShowVolumeSlider(true)
      }}
      onMouseLeave={() => {
        hideSliderTimeoutRef.current = setTimeout(() => {
          setShowVolumeSlider(false)
        }, 150)
      }}
    >
      <div
        className={cn(
          "flex items-center gap-1 rounded-md pe-2 transition-all duration-200",
          showVolumeSlider ? "bg-muted-foreground/20" : ""
        )}
      >
        <button
          type="button"
          onClick={toggleMute}
          className="rounded-md p-2 hover:bg-muted-foreground/10"
          aria-label={isMuted ? "取消静音" : "静音"}
        >
          {isMuted || volume === 0 ? (
            <VolumeXIcon className="size-5" />
          ) : (
            <Volume2Icon className="size-5" />
          )}
        </button>

        <div
          className="flex items-center"
          onMouseEnter={() => {
            if (hideSliderTimeoutRef.current) {
              clearTimeout(hideSliderTimeoutRef.current)
            }
          }}
        >
          <div
            className={cn(
              "w-24 origin-left transition-all duration-200 ease-out",
              showVolumeSlider ? "scale-x-100 opacity-100" : "hidden"
            )}
          >
            <Slider
              value={[volume * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
