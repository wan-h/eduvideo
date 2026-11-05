"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"
import { Loader2Icon, PauseIcon, PlayIcon, VolumeXIcon } from "lucide-react"

interface SubtitleAudioIndicatorProps {
  /** 音频 URL */
  audio: string
  /** 持续时间（毫秒） */
  duration: number
  /** 是否正在重新生成 */
  isRegenerating: boolean
  /** 是否正在播放 */
  isPlaying: boolean
  /** 点击播放/暂停 */
  onPlay: (e: React.MouseEvent) => void
}

/**
 * 字幕音频状态指示器
 *
 * 状态优先级：生成中 > 未生成 > 播放中/可播放
 */
export function SubtitleAudioIndicator({
  audio,
  duration,
  isRegenerating,
  isPlaying,
  onPlay,
}: SubtitleAudioIndicatorProps) {
  if (isRegenerating) {
    return (
      <>
        <Loader2Icon className="size-3 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">loading...</span>
      </>
    )
  }

  if (!audio) {
    return (
      <>
        <VolumeXIcon className="size-3 text-muted-foreground/50" />
        <span className="text-muted-foreground/50">未生成</span>
      </>
    )
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        className={cn(
          "size-5 hover:text-foreground",
          isPlaying ? "text-brand" : "text-muted-foreground"
        )}
        aria-label={isPlaying ? "暂停" : "播放字幕音频"}
        onClick={onPlay}
      >
        {isPlaying ? (
          <PauseIcon className="size-3" />
        ) : (
          <PlayIcon className="size-3" />
        )}
      </Button>
      <span>{`${(duration / 1000).toFixed(1)}s`}</span>
    </>
  )
}
