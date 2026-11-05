import {
  deleteSession,
  listMessages,
  renameSession,
} from "@/api/eduai/conversation"
import { useConversationStore } from "@/store/conversation-store"
import { useCallback } from "react"

export function useConversationList(scriptTaskId: string) {
  const isLoadingSessions = useConversationStore((s) => s.isLoadingSessions)
  const isLoadingMessages = useConversationStore((s) => s.isLoadingMessages)
  const setLoadingMessages = useConversationStore((s) => s.setLoadingMessages)
  const setMessages = useConversationStore((s) => s.setMessages)
  const removeSession = useConversationStore((s) => s.removeSession)
  const loadSessions = useConversationStore((s) => s.loadSessions)

  const loadStoreSessions = useCallback(
    async (passedTaskId?: string) => {
      await loadSessions(passedTaskId ?? scriptTaskId)
    },
    [scriptTaskId, loadSessions]
  )

  const loadMessages = useCallback(
    async (sessionId: string, offset = 0, append = false) => {
      setLoadingMessages(true)
      try {
        const result = await listMessages(sessionId, 50, offset)
        setMessages(sessionId, result.messages, result.total, append)
      } finally {
        setLoadingMessages(false)
      }
    },
    [setLoadingMessages, setMessages]
  )

  const handleRename = useCallback(
    async (sessionId: string, title: string) => {
      await renameSession(sessionId, { title })
      await loadSessions(scriptTaskId)
    },
    [scriptTaskId, loadSessions]
  )

  const handleDelete = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId)
      removeSession(sessionId)
    },
    [removeSession]
  )

  return {
    isLoadingSessions,
    isLoadingMessages,
    loadSessions: loadStoreSessions,
    loadMessages,
    handleRename,
    handleDelete,
  }
}
