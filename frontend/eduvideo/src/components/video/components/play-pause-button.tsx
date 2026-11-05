import type { PlayerRef } from "@remotion/player"
import { PauseIcon, PlayIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { cn } from "@/utils/cn"
import { useSegmentStore } from "../store/segment-store"
import { useSubtitleStore } from "../store/subtitle-store"

export function PlayPauseButton({
  playerRef,
}: {
  playerRef: React.RefObject<PlayerRef | null>
}) {
  const [playing, setPlaying] = useState(false)
  const isEditingSegment = useSegmentStore((s) => s.isEditingSegment)
  const editingSubtitleId = useSubtitleStore((s) => s.editingSubtitleId)
  const isBlocked = isEditingSegment || editingSubtitleId !== null

  useEffect(() => {
    const { current } = playerRef
    setPlaying(current?.isPlaying() ?? false)
    if (!current) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    current.addEventListener("play", onPlay)
    current.addEventListener("pause", onPause)

    return () => {
      current.removeEventListener("play", onPlay)
      current.removeEventListener("pause", onPause)
    }
  }, [playerRef])

  const onToggle = useCallback(() => {
    if (isBlocked) return
    playerRef.current?.toggle()
  }, [playerRef, isBlocked])

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isBlocked}
      className={cn(
        "rounded-md p-2",
        isBlocked
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-muted-foreground/20"
      )}
      aria-label={playing ? "暂停" : isBlocked ? "编辑中，无法播放" : "播放"}
    >
      {playing ? (
        <PauseIcon className="size-5" />
      ) : (
        <PlayIcon className="size-5" />
      )}
    </button>
  )
}
