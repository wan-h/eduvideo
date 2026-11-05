import { listSessions } from "@/api/eduai/conversation"
import type { MessageInfo, SessionInfo } from "@/api/eduai/conversation.types"
import { create, useStore } from "zustand"
import { immer } from "zustand/middleware/immer"

/** 会话数据适配器接口 — 用于测试注入和 HTTP 实现解耦 */
export interface SessionAdapter {
  listSessions(scriptTaskId: string): Promise<{ sessions: SessionInfo[] }>
}

const defaultSessionAdapter: SessionAdapter = {
  get listSessions() {
    return listSessions
  },
}

function resolveSessionAdapter(adapter?: SessionAdapter): SessionAdapter {
  return adapter ?? defaultSessionAdapter
}

export interface ConversationState {
  /* sessions */
  sessions: SessionInfo[]
  currentSessionId: string | null

  /* messages 缓存: key = sessionId */
  messagesBySession: Record<string, MessageInfo[]>
  messageTotals: Record<string, number>

  /* loading / streaming */
  isLoadingSessions: boolean
  isLoadingMessages: boolean
  isStreaming: boolean

  /* actions */
  setSessions: (sessions: SessionInfo[]) => void
  addSession: (session: SessionInfo) => void
  removeSession: (sessionId: string) => void
  updateSessionTitle: (sessionId: string, title: string) => void
  setCurrentSessionId: (sessionId: string | null) => void
  setMessages: (
    sessionId: string,
    messages: MessageInfo[],
    total: number,
    append?: boolean
  ) => void
  appendStreamingMessage: (
    sessionId: string,
    messageId: string,
    content: string,
    role: string,
    thinking?: string
  ) => void
  setLoadingSessions: (loading: boolean) => void
  setLoadingMessages: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  removeMessage: (sessionId: string, messageId: string) => void
  loadSessions: (
    scriptTaskId: string,
    adapter?: SessionAdapter
  ) => Promise<void>
}

export const conversationStore = create<ConversationState>()(
  immer((set) => ({
    sessions: [],
    currentSessionId: null,
    messagesBySession: {},
    messageTotals: {},
    isLoadingSessions: false,
    isLoadingMessages: false,
    isStreaming: false,

    setSessions: (sessions) =>
      set((s) => {
        s.sessions = sessions
      }),

    loadSessions: async (scriptTaskId, adapter) => {
      const fetcher = resolveSessionAdapter(adapter)
      set((s) => {
        s.isLoadingSessions = true
      })
      try {
        const result = await fetcher.listSessions(scriptTaskId)
        set((s) => {
          s.sessions = result.sessions
        })
      } finally {
        set((s) => {
          s.isLoadingSessions = false
        })
      }
    },

    addSession: (session) =>
      set((s) => {
        s.sessions.unshift(session)
      }),

    removeSession: (sessionId) =>
      set((s) => {
        s.sessions = s.sessions.filter((ses) => ses.session_id !== sessionId)
        delete s.messagesBySession[sessionId]
        delete s.messageTotals[sessionId]
        if (s.currentSessionId === sessionId) {
          s.currentSessionId = null
        }
      }),

    updateSessionTitle: (sessionId, title) =>
      set((s) => {
        const ses = s.sessions.find((x) => x.session_id === sessionId)
        if (ses) ses.title = title
      }),

    setCurrentSessionId: (sessionId) =>
      set((s) => {
        s.currentSessionId = sessionId
      }),

    setMessages: (sessionId, messages, total, append = false) =>
      set((s) => {
        if (append && s.messagesBySession[sessionId]) {
          s.messagesBySession[sessionId] = [
            ...messages,
            ...s.messagesBySession[sessionId],
          ]
        } else {
          const existing = s.messagesBySession[sessionId]
          const cachedThinking = existing
            ? [...existing].reverse().find((m) => m.thinking)?.thinking
            : undefined
          if (cachedThinking && messages.length > 0) {
            const lastAssistantIdx = messages.findLastIndex(
              (m) => m.role === "assistant"
            )
            s.messagesBySession[sessionId] =
              lastAssistantIdx >= 0
                ? messages.map((m, i) =>
                    i === lastAssistantIdx
                      ? { ...m, thinking: cachedThinking }
                      : m
                  )
                : messages
          } else {
            s.messagesBySession[sessionId] = messages
          }
        }
        s.messageTotals[sessionId] = total
      }),

    appendStreamingMessage: (sessionId, messageId, content, role, thinking) =>
      set((s) => {
        if (!s.messagesBySession[sessionId]) {
          s.messagesBySession[sessionId] = []
        }
        const msgs = s.messagesBySession[sessionId]
        const last = msgs[msgs.length - 1]
        if (last && last.message_id === messageId) {
          last.content = content
          if (thinking !== undefined) {
            last.thinking = thinking
          }
        } else {
          msgs.push({
            message_id: messageId,
            role,
            content,
            thinking,
            created_at: new Date().toISOString(),
          })
        }
      }),

    setLoadingSessions: (loading) =>
      set((s) => {
        s.isLoadingSessions = loading
      }),

    setLoadingMessages: (loading) =>
      set((s) => {
        s.isLoadingMessages = loading
      }),

    setStreaming: (streaming) =>
      set((s) => {
        s.isStreaming = streaming
      }),

    removeMessage: (sessionId, messageId) =>
      set((s) => {
        const msgs = s.messagesBySession[sessionId]
        if (!msgs) return
        s.messagesBySession[sessionId] = msgs.filter(
          (m) => m.message_id !== messageId
        )
      }),
  }))
)

export function useConversationStore<T>(
  selector: (state: ConversationState) => T
): T {
  return useStore(conversationStore, selector)
}
