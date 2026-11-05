import type { PlayerRef } from "@remotion/player"
import { useEffect, useRef, useState } from "react"

/**
 * 帧数转时间显示 (M:SS)
 */
export function formatTime(frame: number, fps: number): string {
  const hours = Math.floor(frame / fps / 3600)
  const remainingMinutes = frame - hours * fps * 3600
  const minutes = Math.floor(remainingMinutes / 60 / fps)
  const remainingSec = frame - hours * fps * 3600 - minutes * fps * 60
  const seconds = Math.floor(remainingSec / fps)
  const frameAfterSec = Math.round(frame % fps)

  const minutesStr = String(minutes).padStart(2, "0")
  const secondsStr = String(seconds).padStart(2, "0")
  const frameStr = String(frameAfterSec).padStart(2, "0")

  if (hours > 0) {
    return `${hours}:${minutesStr}:${secondsStr}.${frameStr}`
  }

  return `${minutesStr}:${secondsStr}.${frameStr}`
}

/**
 * 时间字符串解析为帧数
 * 支持格式: M:SS.FF, H:MM:SS.FF, 纯秒数, 纯帧数
 * 返回 null 表示格式无效
 */
export function parseTime(str: string, fps: number): number | null {
  const trimmed = str.trim()
  if (!trimmed) return null

  // 含冒号: H:MM:SS.FF 或 M:SS.FF
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":")
    if (parts.length < 2 || parts.length > 3) return null

    const hasHours = parts.length === 3
    const hours = hasHours ? parseInt(parts[0], 10) : 0
    const minutes = parseInt(parts[hasHours ? 1 : 0], 10)
    const secAndFrame = parts[hasHours ? 2 : 1]

    if (isNaN(hours) || isNaN(minutes)) return null

    const sfParts = secAndFrame.split(".")
    const seconds = parseInt(sfParts[0], 10)
    const frames =
      sfParts.length > 1 ? parseInt(sfParts[1].padStart(2, "0"), 10) : 0

    if (isNaN(seconds) || isNaN(frames)) return null
    if (hours < 0 || minutes < 0 || seconds < 0 || frames < 0) return null
    if (frames >= fps) return null
    if (seconds >= 60 || minutes >= 60) return null

    return hours * 3600 * fps + minutes * 60 * fps + seconds * fps + frames
  }

  // 含小数点: 秒数.小数
  if (trimmed.includes(".")) {
    const num = parseFloat(trimmed)
    if (isNaN(num) || num < 0) return null
    return Math.round(num * fps)
  }

  // 纯数字: 秒数
  const num = parseInt(trimmed, 10)
  if (isNaN(num) || num < 0) return null
  return num * fps
}

/**
 * 时间显示组件 - 显示当前帧/总时长，支持点击编辑跳转
 */
export function TimeDisplay({
  durationInFrames,
  fps,
  playerRef,
}: {
  durationInFrames: number
  fps: number
  playerRef: React.RefObject<PlayerRef | null>
}) {
  const [frame, setFrame] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const { current } = playerRef
    if (!current) return

    const onFrameUpdate = () => {
      setFrame(current.getCurrentFrame())
    }

    current.addEventListener("frameupdate", onFrameUpdate)

    return () => {
      current.removeEventListener("frameupdate", onFrameUpdate)
    }
  }, [playerRef])

  const currentDisplay = formatTime(frame, fps)
  const totalDisplay = formatTime(durationInFrames, fps)

  const handleClick = () => {
    confirmedRef.current = false
    setInputValue(currentDisplay)
    setIsEditing(true)
  }

  const confirmedRef = useRef(false)

  const handleConfirm = () => {
    if (confirmedRef.current) return
    const parsed = parseTime(inputValue, fps)
    if (parsed === null || parsed < 0 || parsed > durationInFrames) {
      setIsEditing(false)
      return
    }
    confirmedRef.current = true
    const wasPlaying = playerRef.current?.isPlaying() ?? false
    playerRef.current?.seekTo(parsed)
    if (wasPlaying) {
      playerRef.current?.play()
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === "Escape") {
      setIsEditing(false)
    }
  }

  // 聚焦 + 全选
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const inputSize = Math.max(5, totalDisplay.length)

  return (
    <span className="text-sm text-muted-foreground tabular-nums select-none">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleConfirm}
          onKeyDown={handleKeyDown}
          size={inputSize}
          className="border-b border-border bg-transparent text-sm text-brand tabular-nums focus:outline-none"
        />
      ) : (
        <span onClick={handleClick} className="cursor-pointer hover:text-brand">
          {currentDisplay}
        </span>
      )}
      {" / "}
      <span>{totalDisplay}</span>
    </span>
  )
}
