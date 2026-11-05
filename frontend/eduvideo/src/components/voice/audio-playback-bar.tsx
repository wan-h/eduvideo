import { PauseIcon, PlayIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

interface AudioPlaybackBarProps {
  audioUrl: string | null
  fallbackDuration: number
  className?: string
}

export function AudioPlaybackBar({
  audioUrl,
  fallbackDuration,
  className,
}: AudioPlaybackBarProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const audioElRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!audioUrl) return

    const audio = new Audio(audioUrl)
    audioElRef.current = audio

    const onLoaded = () => setAudioDuration(audio.duration)
    const onTime = () => setCurrentTime(audio.currentTime)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const onError = () => {
      toast.error("音频加载失败")
      setIsPlaying(false)
    }

    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("error", onError)

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("error", onError)
      audio.pause()
      audio.src = ""
      audioElRef.current = null
      setIsPlaying(false)
    }
  }, [audioUrl])

  const togglePlay = useCallback(() => {
    const audio = audioElRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play()
      setIsPlaying(true)
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }, [])

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioElRef.current
      if (!audio || audioDuration <= 0) return
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width)
      )
      audio.currentTime = ratio * audioDuration
    },
    [audioDuration]
  )

  const formatTime = (s: number) => {
    const secs = Math.floor(s)
    return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`
  }

  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={togglePlay}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-green-600 hover:bg-green-50"
        aria-label={isPlaying ? "暂停" : "播放"}
      >
        {isPlaying ? (
          <PauseIcon className="size-4" />
        ) : (
          <PlayIcon className="size-4" />
        )}
      </button>
      <div
        role="slider"
        aria-label="播放进度"
        aria-valuemin={0}
        aria-valuemax={audioDuration}
        aria-valuenow={currentTime}
        tabIndex={0}
        className="h-2 flex-1 cursor-pointer rounded-full bg-green-100"
        onClick={handleSeek}
      >
        <div
          className="h-full rounded-full bg-green-500 transition-[width] duration-75"
          style={{
            width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%`,
          }}
        />
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatTime(currentTime)} /{" "}
        {formatTime(audioDuration || fallbackDuration)}
      </span>
    </div>
  )
}
