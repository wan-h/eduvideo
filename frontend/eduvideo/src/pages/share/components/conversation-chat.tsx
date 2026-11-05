"use no memo"

import { Button } from "@/components/ui/button"
import { useConversationStore } from "@/store/conversation-store"
import type { FeScene } from "@ask2vid/shared"
import type { PlayerRef } from "@remotion/player"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ArrowDown, Bot, Loader2, MessageSquarePlus } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useConversationChat } from "../hooks/use-conversation-chat"
import { useConversationList } from "../hooks/use-conversation-list"
import { useCurrentContext } from "../hooks/use-current-context"
import { chatCSS } from "./chat-css"
import { ChatInput } from "./chat-input"
import { CollapseButton } from "./collapse-button"
import { MessageBubble } from "./message-bubble"
import { useLanguage } from "@/i18n/language-provider"

interface ConversationChatProps {
  scriptTaskId: string
  playerRef: React.RefObject<PlayerRef | null>
  scenes: FeScene[]
  fps: number
  onSessionCreated?: (sessionId: string) => void
}

export function ConversationChat({
  scriptTaskId,
  playerRef,
  scenes,
  fps,
  onSessionCreated,
}: ConversationChatProps) {
  const currentSessionId = useConversationStore((s) => s.currentSessionId)
  const setCurrentSessionId = useConversationStore((s) => s.setCurrentSessionId)
  const messagesBySession = useConversationStore((s) => s.messagesBySession)
  const messageTotals = useConversationStore((s) => s.messageTotals)
  const isStreaming = useConversationStore((s) => s.isStreaming)

  const { translate } = useLanguage()

  const { loadMessages, isLoadingMessages } = useConversationList(scriptTaskId)
  const { send, abort } = useConversationChat(scriptTaskId, {
    onSessionCreated,
  })
  const { getCurrentContext } = useCurrentContext(playerRef, scenes, fps)

  const [streamError, setStreamError] = useState<string | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // 新建会话时清空错误信息
  useEffect(() => {
    if (!currentSessionId) {
      setStreamError(null)
    }
  }, [currentSessionId])
  const parentRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const lastUserMessageRef = useRef("")

  const NEW_SESSION_TEMP_KEY = ""

  const messages = currentSessionId
    ? (messagesBySession[currentSessionId] ?? [])
    : isStreaming
      ? (messagesBySession[NEW_SESSION_TEMP_KEY] ?? [])
      : []

  const total = currentSessionId ? (messageTotals[currentSessionId] ?? 0) : 0
  const hasMore = messages.length < total

  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer returns incompatible fns, handled by "use no memo"
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    getItemKey: (index) => messages[index]!.message_id,
    overscan: 6,
  })

  // 容器宽度变化时强制虚拟列表重新测量 item 高度
  const prevWidthRef = useRef(0)

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect && rect.width !== prevWidthRef.current) {
        prevWidthRef.current = rect.width
        virtualizer.measure()
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [virtualizer])

  const hasSession = !!currentSessionId

  // 追踪用户是否在底部，决定新消息时是否自动滚动
  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const handler = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 80
      shouldAutoScrollRef.current = isAtBottom
      setShowScrollButton(!isAtBottom)
    }
    el.addEventListener("scroll", handler, { passive: true })
    return () => el.removeEventListener("scroll", handler)
  }, [hasSession])

  // 新消息时自动滚动到底部
  useEffect(() => {
    if (shouldAutoScrollRef.current && messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: "end" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  // 加载当前会话的消息（流式中跳过，避免覆盖 store 中暂存的消息）
  useEffect(() => {
    if (currentSessionId && !isStreaming) {
      loadMessages(currentSessionId)
    }
  }, [currentSessionId, loadMessages, isStreaming])

  // 无限滚动：上滑加载更多
  const virtualItems = virtualizer.getVirtualItems()
  const fetchMoreOnTopRef = useRef(false)
  useEffect(() => {
    const [firstItem] = [...virtualItems]
    if (
      firstItem &&
      firstItem.index === 0 &&
      hasMore &&
      !isLoadingMessages &&
      !fetchMoreOnTopRef.current &&
      currentSessionId
    ) {
      fetchMoreOnTopRef.current = true
      loadMessages(currentSessionId, messages.length, true).finally(() => {
        fetchMoreOnTopRef.current = false
      })
    }
  }, [
    virtualItems,
    hasMore,
    isLoadingMessages,
    currentSessionId,
    messages.length,
    loadMessages,
  ])

  async function handleSend(text: string) {
    if (!text || isStreaming) return
    setStreamError(null)
    lastUserMessageRef.current = text

    const ctx = getCurrentContext()

    shouldAutoScrollRef.current = true
    try {
      await send(text, {
        current_teacher_handout: ctx?.current_teacher_handout,
        current_teacher_explanation: ctx?.current_teacher_explanation,
      })
    } catch (err) {
      setStreamError(err instanceof Error ? err.message : translate("发送失败，请重试"))
    }
  }

  function handleRetry() {
    handleSend(lastUserMessageRef.current)
  }

  // 无选中会话且非流式中时显示空状态
  if (!currentSessionId && !isStreaming) {
    return (
      <>
        <style>{chatCSS}</style>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">AI 聊天</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentSessionId(null)}
                title={translate("新建会话")}
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
              <CollapseButton />
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <Bot className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              选择一个会话或发送消息开始新对话
            </p>
            <ChatInput
              compact
              isStreaming={isStreaming}
              onSend={handleSend}
              onAbort={abort}
              onRetry={handleRetry}
              streamError={streamError}
            />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{chatCSS}</style>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">AI 聊天</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentSessionId(null)}
              title={translate("新建会话")}
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            <CollapseButton />
          </div>
        </div>

        {/* 消息区域 */}
        <div className="relative flex-1">
          <div
            ref={parentRef}
            className="absolute inset-0 overflow-auto px-3 pt-3"
          >
            {isLoadingMessages && messages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                开始新对话
              </div>
            ) : (
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  position: "relative",
                  width: "100%",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const msg = messages[virtualItem.index]!
                  const isLast = virtualItem.index === messages.length - 1
                  return (
                    <div
                      key={virtualItem.key}
                      ref={virtualizer.measureElement}
                      data-index={virtualItem.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        transform: `translateY(${virtualItem.start}px)`,
                        width: "100%",
                      }}
                    >
                      <MessageBubble
                        role={msg.role}
                        content={msg.content}
                        thinking={msg.thinking}
                        isStreaming={
                          isStreaming && isLast && msg.role === "assistant"
                        }
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {/* 回到底部按钮 */}
          {showScrollButton && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-6 bottom-4 z-10 h-8 w-8 rounded-full shadow"
              onClick={() => {
                shouldAutoScrollRef.current = true
                virtualizer.scrollToIndex(messages.length - 1, { align: "end" })
              }}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 输入区域 */}
        <ChatInput
          isStreaming={isStreaming}
          onSend={handleSend}
          onAbort={abort}
          onRetry={handleRetry}
          streamError={streamError}
        />
      </div>
    </>
  )
}
