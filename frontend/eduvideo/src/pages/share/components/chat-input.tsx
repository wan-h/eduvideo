import { Button } from "@/components/ui/button"
 import { useLanguage } from "@/i18n/language-provider"
import { ArrowUpIcon, SquareIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const MIN_HEIGHT = 60
const MAX_HEIGHT = 200

interface ChatInputProps {
  isStreaming: boolean
  onSend: (text: string) => void
  onAbort: () => void
  onRetry?: () => void
  streamError?: string | null
  compact?: boolean
}

export function ChatInput({
  isStreaming,
  onSend,
  onAbort,
  onRetry,
  streamError,
  compact,
}: ChatInputProps) {
  const { translate } = useLanguage()
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = () => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    const nextHeight = Math.min(
      Math.max(el.scrollHeight, MIN_HEIGHT),
      MAX_HEIGHT
    )
    el.style.height = `${nextHeight}px`
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden"
  }

  useEffect(() => {
    adjustHeight()
  }, [value])

  function handleSend() {
    const text = value.trim()
    if (!text || isStreaming) return
    setValue("")
    onSend(text)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={compact ? "w-full" : "border-t p-3"}>
      {streamError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <span className="flex-1">{streamError}</span>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-destructive hover:text-destructive"
              onClick={onRetry}
            >
              重试
            </Button>
          )}
        </div>
      )}
      <div className="rounded-xl border">
        <div className="overflow-hidden rounded-xl bg-background">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={translate("输入消息...")}
            className="w-full resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
            rows={1}
            style={{ height: MIN_HEIGHT }}
          />
          <div className="flex items-center justify-end gap-2 px-3 pb-2">
            <span className="text-xs text-muted-foreground">
              {translate("Shift + Enter 换行")}
            </span>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-40"
              disabled={!isStreaming && !value.trim()}
              onClick={() => (isStreaming ? onAbort() : handleSend())}
            >
              {isStreaming ? (
                <SquareIcon className="size-4" />
              ) : (
                <ArrowUpIcon className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
