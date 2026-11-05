import { cn } from "@/utils/cn"
import { useLanguage } from "@/i18n/language-provider"
import { MdRenderer } from "@ask2vid/shared"
import { ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="thinking-dot inline-block h-1.5 w-1.5 rounded-full bg-foreground/50"
          style={{ animationDelay: `${-0.32 + i * 0.16}s` }}
        />
      ))}
    </span>
  )
}

function ThinkingSection({
  thinking,
  isInProgress,
}: {
  thinking: string
  isInProgress: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const { translate } = useLanguage()
  const doneRef = useRef(false)

  useEffect(() => {
    if (!isInProgress && !doneRef.current) {
      doneRef.current = true
      setExpanded(false)
    }
  }, [isInProgress])

  const label = isInProgress ? translate("思考中...") : expanded ? translate("思考过程") : translate("思考完成")

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-muted-foreground/70 transition-colors hover:text-muted-foreground"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            !expanded && "-rotate-90"
          )}
        />
        <span>{label}</span>
        {isInProgress && (
          <span className="ml-1 inline-block h-2.5 w-1 animate-pulse bg-muted-foreground/50 align-middle" />
        )}
      </button>
      {expanded && (
        <div
          className="mt-1 border-l-2 border-muted-foreground/20 pl-2 text-xs text-muted-foreground/80"
          data-no-translate
        >
          <MdRenderer content={thinking} />
        </div>
      )}
    </div>
  )
}

interface MessageBubbleProps {
  role: string
  content: string
  thinking?: string
  isStreaming?: boolean
}

export function MessageBubble({
  role,
  content,
  thinking,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = role === "user"
  const thinkingInProgress = Boolean(
    isStreaming && !isUser && !content && thinking
  )
  const showDots = !isUser && isStreaming && !content && !thinking
  const [contentKey, setContentKey] = useState(0)
  const prevEmptyRef = useRef(content === "")

  useEffect(() => {
    const wasEmpty = prevEmptyRef.current
    const isEmpty = content === ""
    prevEmptyRef.current = isEmpty
    if (wasEmpty && !isEmpty && !isUser) {
      setContentKey((k) => k + 1)
    }
  }, [content, isUser])

  return (
    <div className={cn("mb-4 flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-2.5 text-sm",
          isUser ? "bg-brand text-brand-foreground" : "bg-muted"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap" data-no-translate>
            {content}
          </p>
        ) : (
          <>
            {thinking && (
              <ThinkingSection
                thinking={thinking}
                isInProgress={thinkingInProgress}
              />
            )}
            {showDots ? (
              <ThinkingDots />
            ) : (
              <span
                key={contentKey}
                className="assistant-content-enter inline-block"
                data-no-translate
              >
                <MdRenderer content={content} />
              </span>
            )}
          </>
        )}
        {isStreaming && !showDots && (
          <span className="ml-1 inline-block h-3.5 w-1 animate-pulse bg-current align-middle" />
        )}
      </div>
    </div>
  )
}
