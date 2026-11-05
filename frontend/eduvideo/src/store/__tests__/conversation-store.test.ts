/** @vitest-environment happy-dom */
import { renderHook } from "@testing-library/react"
import { describe, expect, it, beforeEach, vi } from "vitest"
import type { MessageInfo, SessionInfo } from "@/api/eduai/conversation.types"
import { conversationStore, useConversationStore } from "../conversation-store"

const createMockSession = (overrides?: Partial<SessionInfo>): SessionInfo => ({
  session_id: "s1",
  title: "Session 1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
})

const createMockMessage = (overrides?: Partial<MessageInfo>): MessageInfo => ({
  message_id: "m1",
  role: "user",
  content: "hello",
  created_at: "2026-01-01T00:00:00Z",
  ...overrides,
})

describe("conversationStore", () => {
  beforeEach(() => {
    conversationStore.setState({
      sessions: [],
      currentSessionId: null,
      messagesBySession: {},
      messageTotals: {},
      isLoadingSessions: false,
      isLoadingMessages: false,
      isStreaming: false,
    })
  })

  it("should initialize default state", () => {
    const state = conversationStore.getState()
    expect(state.sessions).toEqual([])
    expect(state.currentSessionId).toBeNull()
    expect(state.isStreaming).toBe(false)
  })

  it("should set sessions and add session", () => {
    const mockSession = createMockSession({ session_id: "s1", title: "Session 1" })
    conversationStore.getState().setSessions([mockSession])

    expect(conversationStore.getState().sessions).toEqual([mockSession])

    const mockSession2 = createMockSession({
      session_id: "s2",
      title: "Session 2",
      created_at: "2026-01-02T00:00:00Z",
    })
    conversationStore.getState().addSession(mockSession2)

    expect(conversationStore.getState().sessions).toEqual([mockSession2, mockSession])
  })

  it("should remove session and clean messages", () => {
    const mockSession = createMockSession({ session_id: "s1", title: "Session 1" })
    conversationStore.getState().setSessions([mockSession])
    conversationStore.getState().setCurrentSessionId("s1")
    conversationStore.getState().setMessages("s1", [createMockMessage({ message_id: "m1", role: "user", content: "hi" })], 1)

    conversationStore.getState().removeSession("s1")

    const state = conversationStore.getState()
    expect(state.sessions).toEqual([])
    expect(state.currentSessionId).toBeNull()
    expect(state.messagesBySession["s1"]).toBeUndefined()
  })

  it("should update session title", () => {
    const mockSession = createMockSession({ session_id: "s1", title: "Old Title" })
    conversationStore.getState().setSessions([mockSession])

    conversationStore.getState().updateSessionTitle("s1", "New Title")

    expect(conversationStore.getState().sessions[0].title).toBe("New Title")
  })

  it("should set and append messages", () => {
    const msg1 = createMockMessage({ message_id: "m1", role: "user", content: "hello" })
    const msg2 = createMockMessage({ message_id: "m2", role: "assistant", content: "world" })

    conversationStore.getState().setMessages("s1", [msg1], 1)
    expect(conversationStore.getState().messagesBySession["s1"]).toEqual([msg1])

    conversationStore.getState().setMessages("s1", [msg2], 2, true)
    expect(conversationStore.getState().messagesBySession["s1"]).toEqual([msg2, msg1])
  })

  it("should append streaming message", () => {
    conversationStore.getState().appendStreamingMessage("s1", "m1", "Hello", "assistant", "thinking...")

    let msgs = conversationStore.getState().messagesBySession["s1"]
    expect(msgs).toHaveLength(1)
    expect(msgs[0].content).toBe("Hello")
    expect(msgs[0].thinking).toBe("thinking...")

    // Update same streaming message
    conversationStore.getState().appendStreamingMessage("s1", "m1", "Hello World", "assistant", "thinking complete")

    msgs = conversationStore.getState().messagesBySession["s1"]
    expect(msgs).toHaveLength(1)
    expect(msgs[0].content).toBe("Hello World")
    expect(msgs[0].thinking).toBe("thinking complete")
  })

  it("should remove message from session", () => {
    const msg1 = createMockMessage({ message_id: "m1", role: "user", content: "hello" })
    const msg2 = createMockMessage({ message_id: "m2", role: "assistant", content: "world" })
    conversationStore.getState().setMessages("s1", [msg1, msg2], 2)

    conversationStore.getState().removeMessage("s1", "m1")

    expect(conversationStore.getState().messagesBySession["s1"]).toEqual([msg2])
  })

  it("should load sessions via adapter", async () => {
    const mockSessions = [createMockSession({ session_id: "s10", title: "Loaded" })]
    const mockAdapter = {
      listSessions: vi.fn().mockResolvedValue({ sessions: mockSessions }),
    }

    await conversationStore.getState().loadSessions("script_123", mockAdapter)

    expect(mockAdapter.listSessions).toHaveBeenCalledWith("script_123")
    expect(conversationStore.getState().sessions).toEqual(mockSessions)
    expect(conversationStore.getState().isLoadingSessions).toBe(false)
  })

  it("should update loading and streaming flags", () => {
    conversationStore.getState().setLoadingSessions(true)
    expect(conversationStore.getState().isLoadingSessions).toBe(true)

    conversationStore.getState().setLoadingMessages(true)
    expect(conversationStore.getState().isLoadingMessages).toBe(true)

    conversationStore.getState().setStreaming(true)
    expect(conversationStore.getState().isStreaming).toBe(true)
  })

  it("should expose hook selector", () => {
    const { result } = renderHook(() => useConversationStore((s) => s.isStreaming))
    expect(result.current).toBe(false)
  })
})
