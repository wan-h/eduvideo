import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

interface UseAudioPlayerReturn {
  /** 当前正在播放的音频 ID */
  playingId: string | null
  /** 播放指定音频，若 id 正在播放则暂停 */
  play: (id: string, url: string) => void
  /** 暂停当前播放 */
  pause: () => void
  /** 停止播放，传 id 时仅匹配当前播放才停止 */
  stop: (id?: string) => void
}

/**
 * 音频播放管理 Hook
 *
 * 特性：
 * - 单实例播放：同一时刻只播放一个音频
 * - 点击正在播放的项 → 暂停
 * - 自动处理 ended / error 事件
 * - 组件卸载自动清理
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const cleanupAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audioRef.current = null
  }, [])

  const play = useCallback(
    (id: string, url: string) => {
      // 点击正在播放的字幕 → 暂停
      if (playingId === id && audioRef.current) {
        cleanupAudio()
        setPlayingId(null)
        return
      }

      // 有其他音频在播放 → 先停掉
      cleanupAudio()

      const audio = new Audio(url)
      audioRef.current = audio

      const handleEnded = () => {
        setPlayingId(null)
        audioRef.current = null
      }

      const handleError = () => {
        toast.error("音频加载失败")
        setPlayingId(null)
        audioRef.current = null
      }

      audio.addEventListener("ended", handleEnded)
      audio.addEventListener("error", handleError)

      void audio.play()
      setPlayingId(id)
    },
    [playingId, cleanupAudio]
  )

  const pause = useCallback(() => {
    cleanupAudio()
    setPlayingId(null)
  }, [cleanupAudio])

  const stop = useCallback(
    (id?: string) => {
      if (id !== undefined && playingId !== id) return
      cleanupAudio()
      setPlayingId(null)
    },
    [playingId, cleanupAudio]
  )

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanupAudio()
    }
  }, [cleanupAudio])

  return {
    playingId,
    play,
    pause,
    stop,
  }
}
