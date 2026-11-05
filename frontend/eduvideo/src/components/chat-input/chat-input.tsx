import { ArrowUp, Loader2 } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useEffect, useRef } from "react"

import { useSessionStorage } from "@/hooks/use-session-storage"

const MIN_HEIGHT = 100
const MAX_HEIGHT = 200
const DEFAULT_MESSAGE_KEY = "chat-message"

interface ChatInputProps {
  messageKey?: string
  placeholder?: string
  onSubmit?: (message: string) => void
  onPasteFiles?: (files: File[]) => void
  onDropFiles?: (files: File[]) => void
  onFileDragActiveChange?: (isOver: boolean) => void
  isLoading?: boolean
  hasAttachments?: boolean
  footerLeftActions?: ReactNode
  previews?: ReactNode
  dragOverlay?: ReactNode
}

// ── 可复用聊天输入框 ────────────────────────────
export function ChatInput({
  messageKey = DEFAULT_MESSAGE_KEY,
  placeholder = "输入消息...",
  onSubmit,
  onPasteFiles,
  onDropFiles,
  onFileDragActiveChange,
  isLoading = false,
  hasAttachments = false,
  footerLeftActions,
  previews,
  dragOverlay,
}: ChatInputProps) {
  const [message, setMessage] = useSessionStorage(messageKey, "")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dragCounterRef = useRef(0)

  // 根据 scrollHeight 自适应高度，限制在 [MIN_HEIGHT, MAX_HEIGHT]
  const adjustHeight = () => {
    const el = textareaRef.current
    if (!el) return

    el.style.height = "auto"
    const nextHeight = Math.min(
      Math.max(el.scrollHeight, MIN_HEIGHT),
      MAX_HEIGHT
    )
    el.style.height = `${nextHeight}px`
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden"
  }

  // 内容变化时调整高度
  useEffect(() => {
    adjustHeight()
  }, [message])

  const canSend = (message.trim().length > 0 || hasAttachments) && !isLoading

  const doSubmit = () => {
    const trimmed = message.trim()
    if ((!trimmed && !hasAttachments) || isLoading) return

    onSubmit?.(trimmed)
    setMessage("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading) {
        doSubmit()
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null)

    if (imageFiles.length === 0) return

    e.preventDefault()
    onPasteFiles?.(imageFiles)
  }

  const handleDropFiles = (files: File[]) => {
    onDropFiles?.(files)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current = 0
    onFileDragActiveChange?.(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    handleDropFiles(files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      dragCounterRef.current += 1
      if (dragCounterRef.current === 1) {
        onFileDragActiveChange?.(true)
      }
    },
    [onFileDragActiveChange]
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      dragCounterRef.current -= 1
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0
        onFileDragActiveChange?.(false)
      }
    },
    [onFileDragActiveChange]
  )

  return (
    <div
      className="relative w-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {dragOverlay}
      <div className="chat-input-glow rounded-2xl p-[1.5px]">
        <div className="flex flex-col rounded-[calc(1rem+1.5px)] bg-background">
          {previews && <div className="px-4 pt-3">{previews}</div>}
          <textarea
            className="resize-none overflow-hidden bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder={placeholder}
            ref={textareaRef}
            rows={1}
            style={{ height: MIN_HEIGHT }}
            value={message}
            disabled={isLoading}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />

          {/* 底部操作栏 */}
          <div className="flex items-center justify-between gap-2 px-3 pb-2">
            <div className="flex items-center gap-2">{footerLeftActions}</div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Shift + Enter 换行
              </span>
              <button
                aria-label="生成讲解视频"
                className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-40"
                disabled={!canSend}
                type="button"
                onClick={doSubmit}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
