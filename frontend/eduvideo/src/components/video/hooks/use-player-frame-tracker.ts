import type { CallbackListener, PlayerRef } from "@remotion/player"
import { useEffect, useRef, useState } from "react"

/**
 * 通用播放帧追踪 hook。
 *
 * 封装 rAF 等待 player 就绪 → subscribe frameupdate →
 * Map ref 避免重新订阅 → findAtFrame 查找 → 返回当前项。
 *
 * @param playerRef  - Player 的 Ref
 * @param frameMap   - 帧号到数据的映射，通过 ref 持有避免 effect 重新订阅
 * @param findAtFrame - 根据帧号在 frameMap 中查找当前项
 * @param initial     - 初始值（player 未就绪时返回）
 */
export function usePlayerFrameTracker<T, M>(
  playerRef: React.RefObject<PlayerRef | null>,
  frameMap: M,
  findAtFrame: (frame: number, map: M) => T,
  initial: T
): T {
  const [current, setCurrent] = useState<T>(initial)

  const mapRef = useRef(frameMap)
  const findRef = useRef(findAtFrame)

  useEffect(() => {
    mapRef.current = frameMap
  })

  useEffect(() => {
    findRef.current = findAtFrame
  })

  useEffect(() => {
    let rafId: number
    let unsub: (() => void) | undefined

    const trySubscribe = () => {
      const player = playerRef.current
      if (!player) {
        rafId = requestAnimationFrame(trySubscribe)
        return
      }

      const update = () => {
        setCurrent(findRef.current(player.getCurrentFrame(), mapRef.current))
      }

      const handleFrameUpdate: CallbackListener<"frameupdate"> = () => {
        update()
      }

      player.addEventListener("frameupdate", handleFrameUpdate)
      update()

      unsub = () => {
        player.removeEventListener("frameupdate", handleFrameUpdate)
      }
    }

    trySubscribe()

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      unsub?.()
    }
  }, [playerRef])

  return current
}
