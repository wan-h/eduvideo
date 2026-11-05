import type { PlayerRef } from "@remotion/player"
import { Maximize2Icon, Minimize2Icon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

/**
 * 全屏切换按钮
 */
export function FullscreenButton({
  playerRef,
}: {
  playerRef: React.RefObject<PlayerRef | null>
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const { current } = playerRef
    if (!current) return

    const onChange = (e: { detail: { isFullscreen: boolean } }) => {
      setIsFullscreen(e.detail.isFullscreen)
    }

    current.addEventListener("fullscreenchange", onChange)

    return () => {
      current.removeEventListener("fullscreenchange", onChange)
    }
  }, [playerRef])

  const onToggle = useCallback(() => {
    if (!playerRef.current) return
    if (isFullscreen) {
      playerRef.current.exitFullscreen()
    } else {
      playerRef.current.requestFullscreen()
    }
  }, [playerRef, isFullscreen])

  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded-md p-2 hover:bg-muted-foreground/20"
      aria-label={isFullscreen ? "退出全屏" : "全屏"}
    >
      {isFullscreen ? (
        <Minimize2Icon className="size-5" />
      ) : (
        <Maximize2Icon className="size-5" />
      )}
    </button>
  )
}
