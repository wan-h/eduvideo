import { sendChatMessage } from "@/api/eduai/conversation"
import type { ChatReq } from "@/api/eduai/conversation.types"
import {
  conversationStore,
  useConversationStore,
} from "@/store/conversation-store"
import { useCallback, useEffect, useRef } from "react"

interface UseConversationChatOptions {
  onSessionCreated?: (sessionId: string) => void
}

export function useConversationChat(
  scriptTaskId: string,
  opts?: UseConversationChatOptions
) {
  const isStreaming = useConversationStore((s) => s.isStreaming)
  const setStreaming = useConversationStore((s) => s.setStreaming)
  const appendStreamingMessage = useConversationStore(
    (s) => s.appendStreamingMessage
  )
  const removeMessage = useConversationStore((s) => s.removeMessage)
  const currentSessionId = useConversationStore((s) => s.currentSessionId)
  const loadSessions = useConversationStore((s) => s.loadSessions)
  const onSessionCreatedRef = useRef(opts?.onSessionCreated)
  useEffect(() => {
    onSessionCreatedRef.current = opts?.onSessionCreated
  }, [opts?.onSessionCreated])
  const abortRef = useRef<AbortController | null>(null)
  // SSE 流式消息归属的 sessionId，新会话场景下在 session_created 事件中更新
  const sessionRef = useRef<string>("")

  const CHUNK_TIMEOUT_MS = 30_000

  const send = useCallback(
    async (
      message: string,
      context?: {
        current_teacher_handout?: string
        current_teacher_explanation?: string
      }
    ) => {
      if (isStreaming) return
      setStreaming(true)

      sessionRef.current = currentSessionId ?? ""

      // 立即将用户消息添加到本地 store
      const userMessageId = `user-${Date.now()}`
      appendStreamingMessage(sessionRef.current, userMessageId, message, "user")

      // 立即插入空的 assistant 占位消息，用于展示 thinking 圆点
      const assistantMessageId = `assistant-${Date.now()}`
      appendStreamingMessage(
        sessionRef.current,
        assistantMessageId,
        "",
        "assistant"
      )

      const req: ChatReq = {
        script_task_id: scriptTaskId,
        session_id: currentSessionId,
        message,
        current_teacher_handout: context?.current_teacher_handout,
        current_teacher_explanation: context?.current_teacher_explanation,
      }

      let isTimeout = false
      let timeoutId: ReturnType<typeof setTimeout> | undefined

      const resetTimeout = () => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          isTimeout = true
          abortRef.current?.abort()
        }, CHUNK_TIMEOUT_MS)
      }

      try {
        abortRef.current = new AbortController()
        resetTimeout()

        const response = await sendChatMessage(req, abortRef.current.signal)

        if (!response.ok) {
          throw new Error(`Chat request failed: ${response.status}`)
        }

        if (!response.body) {
          throw new Error("Response body is empty")
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let assistantContent = ""
        let thinkingContent = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          // 收到数据，重置超时计时器
          resetTimeout()

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue

            if (trimmed.startsWith("data:")) {
              const data = trimmed.slice(5).trim()

              if (data === "[DONE]") continue

              try {
                const parsed = JSON.parse(data)

                // 处理 session_created 事件（新会话）
                if (parsed.type === "session_created" && parsed.session_id) {
                  const newSessionId = parsed.session_id
                  const tempKey = sessionRef.current

                  // 将暂存在临时 key 下的消息迁移到正式 sessionId
                  // 注意：tempKey 可能是 ""（空字符串是 falsy，不能用 truthiness 判断）
                  const state = conversationStore.getState()
                  const tempMsgs = state.messagesBySession[tempKey] ?? []
                  if (tempMsgs.length > 0) {
                    state.setMessages(
                      newSessionId,
                      [...tempMsgs],
                      tempMsgs.length
                    )
                  }

                  sessionRef.current = newSessionId

                  // 先同步设置 currentSessionId（让组件立即切换读取目标），
                  // 再通知外部做异步副作用（刷新会话列表等），避免窗口期
                  // 消息消失
                  state.setCurrentSessionId(newSessionId)
                  onSessionCreatedRef.current?.(newSessionId)
                  continue
                }

                // 处理思考过程
                if (parsed.type === "thinking") {
                  thinkingContent += parsed.content ?? ""
                  appendStreamingMessage(
                    sessionRef.current,
                    assistantMessageId,
                    assistantContent,
                    "assistant",
                    thinkingContent
                  )
                  continue
                }

                // 处理 content 增量
                if (parsed.type === "delta" || parsed.content) {
                  const content = parsed.content ?? parsed.delta ?? ""
                  assistantContent += content
                  appendStreamingMessage(
                    sessionRef.current,
                    assistantMessageId,
                    assistantContent,
                    "assistant"
                  )
                  continue
                }

                // 处理其他 message 类型
                if (parsed.message) {
                  assistantContent = parsed.message
                  appendStreamingMessage(
                    sessionRef.current,
                    assistantMessageId,
                    assistantContent,
                    "assistant"
                  )
                }
              } catch {
                // 非 JSON 数据跳过
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          if (isTimeout) throw new Error(
            window.localStorage?.getItem("app-language") === "en"
              ? "Response timed out, please retry"
              : "响应超时，请重试"
          )
          return
        }
        // 出错时清理空的 assistant 占位
        removeMessage(sessionRef.current, assistantMessageId)
        throw err
      } finally {
        clearTimeout(timeoutId)
        setStreaming(false)
        abortRef.current = null
        // 清理新会话流中留下的临时 key 消息
        if (!currentSessionId) {
          conversationStore.getState().setMessages("", [], 0)
        }
        loadSessions(scriptTaskId)
      }
    },
    [
      scriptTaskId,
      currentSessionId,
      isStreaming,
      setStreaming,
      appendStreamingMessage,
      removeMessage,
      loadSessions,
    ]
  )

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { send, abort, isStreaming }
}
