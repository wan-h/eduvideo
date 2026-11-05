import type { PlayerRef } from "@remotion/player"
import { useCallback, useSyncExternalStore } from "react"

/**
 * 音量与静音状态管理 hook
 */
export function usePlayerVolume(playerRef: React.RefObject<PlayerRef | null>) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const { current } = playerRef
      if (!current) {
        return () => undefined
      }

      const volumeListener = () => {
        onStoreChange()
      }
      const muteListener = () => {
        onStoreChange()
      }

      current.addEventListener("volumechange", volumeListener)
      current.addEventListener("mutechange", muteListener)

      return () => {
        current.removeEventListener("volumechange", volumeListener)
        current.removeEventListener("mutechange", muteListener)
      }
    },
    [playerRef]
  )

  const volume = useSyncExternalStore<number>(
    subscribe,
    () => playerRef.current?.getVolume() ?? 1,
    () => 1
  )

  const isMuted = useSyncExternalStore<boolean>(
    subscribe,
    () => playerRef.current?.isMuted() ?? false,
    () => false
  )

  const setVolume = useCallback(
    (newVolume: number) => {
      playerRef.current?.setVolume(newVolume)
    },
    [playerRef]
  )

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return
    if (playerRef.current.isMuted()) {
      playerRef.current.unmute()
    } else {
      playerRef.current.mute()
    }
  }, [playerRef])

  return {
    volume,
    isMuted,
    setVolume,
    toggleMute,
  }
}
