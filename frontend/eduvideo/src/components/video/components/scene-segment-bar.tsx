import type { PlayerRef } from "@remotion/player"
import { useMemo } from "react"

import { cn } from "@/utils/cn"
import type { FeScene } from "@ask2vid/shared"

import { MapPinIcon } from "lucide-react"
import { usePlayerFrame } from "../hooks/use-player-frame"
import { computeSceneFrameData } from "../utils/scene-frame"

interface SceneSegmentBarProps {
  scenes: FeScene[]
  fps: number
  onSceneClick: (sceneId: string) => void
  playerRef: React.RefObject<PlayerRef | null>
}

export function SceneSegmentBar({
  scenes,
  fps,
  onSceneClick,
  playerRef,
}: SceneSegmentBarProps) {
  const currentFrame = usePlayerFrame(playerRef)

  const { segmentWidths, totalDurationInFrames, sceneFrameRanges } =
    useMemo(() => {
      const { sceneDurations, totalDurationInFrames, sceneFrameRanges } =
        computeSceneFrameData(scenes, fps)

      const totalMs = sceneDurations.reduce((a, b) => a + b, 0)
      const segmentWidths =
        totalMs > 0
          ? sceneDurations.map((d) => (d / totalMs) * 100)
          : scenes.map(() => 100 / scenes.length)

      return { segmentWidths, totalDurationInFrames, sceneFrameRanges }
    }, [scenes, fps])

  // const progressPercent =
  //   totalDurationInFrames > 0
  //     ? Math.min(100, Math.max(0, (currentFrame / totalDurationInFrames) * 100))
  //     : 0

  const currentSceneId =
    totalDurationInFrames > 0
      ? (() => {
          const index = sceneFrameRanges.findIndex(
            ([start, end]) => currentFrame >= start && currentFrame < end
          )
          return index >= 0 ? scenes[index].id : null
        })()
      : null

  return (
    <div className="relative mt-4 w-full">
      <div className="flex w-full px-4">
        {scenes.map((scene, index) => {
          const isActive = scene.id === currentSceneId
          const width = segmentWidths[index]

          return (
            <button
              key={scene.id}
              type="button"
              className={cn(
                "group relative flex -translate-x-2 flex-col items-start",
                !isActive && "cursor-pointer"
              )}
              style={{ width: `${width}%` }}
            >
              <MapPinIcon
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive
                    ? "fill-brand text-brand"
                    : "fill-muted-foreground text-muted-foreground hover:fill-muted-foreground hover:text-muted-foreground"
                )}
                onClick={() => onSceneClick(scene.id)}
              />
              {/* <div
                className={cn(
                  "h-5 w-full transition-colors duration-200",
                  isActive
                    ? "bg-primary/50"
                    : "bg-muted-foreground/25 group-hover:bg-muted-foreground/40"
                )}
              /> */}
            </button>
          )
        })}
      </div>

      {/* {totalDurationInFrames > 0 && (
        <div className="pointer-events-none absolute inset-x-4 top-0">
          <div
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${progressPercent}%` }}
          >
            <div className="flex flex-col items-center">
              <div className="h-5 w-0.5 rounded-full bg-foreground" />
            </div>
          </div>
        </div>
      )} */}
    </div>
  )
}
