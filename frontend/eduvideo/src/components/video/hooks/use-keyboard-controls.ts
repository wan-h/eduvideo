import type { PlayerRef } from "@remotion/player"
import { useCallback, useEffect } from "react"

import { useSegmentStore } from "../store/segment-store"
import { useSubtitleStore } from "../store/subtitle-store"

/**
 * 键盘快捷键控制 Hook
 *
 * 监听键盘 Space 键，切换视频播放/暂停
 * 在输入框中聚焦时自动禁用快捷键
 *
 * @param playerRef - Player 的 Ref
 * @param enabled - 是否启用键盘快捷键，默认 true
 *
 * @example
 * ```tsx
 * useKeyboardControls(playerRef)
 * ```
 */
export function useKeyboardControls(
  playerRef: React.RefObject<PlayerRef | null>,
  enabled = true
) {
  const isEditingSegment = useSegmentStore((s) => s.isEditingSegment)
  const editingSubtitleId = useSubtitleStore((s) => s.editingSubtitleId)
  const isBlocked = isEditingSegment || editingSubtitleId !== null

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const player = playerRef.current
      if (!player) return
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // 当焦点在弹框内（dialog、contenteditable 等）时不触发
      const target = e.target as HTMLElement
      if (
        target.isContentEditable ||
        target.closest("[role='dialog']") !== null
      ) {
        return
      }

      if (e.key === " ") {
        e.preventDefault()
        if (isBlocked) return
        player.toggle()
      }
    },
    [playerRef, isBlocked]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}
