/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ChatReq } from "@/api/eduai/conversation.types"
import { conversationStore } from "@/store/conversation-store"
import { useConversationChat } from "../use-conversation-chat"

/* ── 辅助函数：创建模拟 SSE Response ── */

function sseLine(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

function createSseResponse(...events: unknown[]): Response {
  const encoder = new TextEncoder()
  const body = events.map((e) => {
    if (typeof e === "string") return encoder.encode(e)
    return encoder.encode(sseLine(e))
  })
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of body) {
          controller.enqueue(chunk)
        }
        controller.close()
      },
    }),
    { status: 200 }
  )
}

function createEmptyResponse(): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.close()
      },
    }),
    { status: 200 }
  )
}

/* ── Mock sendChatMessage ── */

const mockSendChatMessage = vi.fn()

vi.mock("@/api/eduai/conversation", () => ({
  sendChatMessage: (req: ChatReq) => mockSendChatMessage(req),
  listSessions: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}))

/* ── 辅助函数 ── */

function getSessionMessages(sessionId: string) {
  return conversationStore.getState().messagesBySession[sessionId] ?? []
}

/* ── 初始化 / 清理 ── */

beforeEach(() => {
  conversationStore.setState({
    sessions: [],
    currentSessionId: "test-session-1",
    messagesBySession: {},
    messageTotals: {},
    isLoadingSessions: false,
    isLoadingMessages: false,
    isStreaming: false,
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

/* ── 测试 ── */

describe("useConversationChat.send", () => {
  /* ── 核心回归测试 ── */

  it("调用 send 后用户消息应立即出现在 store 中", async () => {
    mockSendChatMessage.mockResolvedValue(createEmptyResponse())

    const { result } = renderHook(() => useConversationChat("task-1"))

    await act(async () => {
      await result.current.send("你好，这是一条用户消息")
    })

    const messages = getSessionMessages("test-session-1")
    expect(messages).toHaveLength(2)
    expect(messages[0]!.role).toBe("user")
    expect(messages[0]!.content).toBe("你好，这是一条用户消息")
  })

  it("收到 delta 事件后 AI 流式回复应追加到 store", async () => {
    mockSendChatMessage.mockResolvedValue(
      createSseResponse(
        { type: "delta", content: "你好" },
        { type: "delta", content: "，世界" }
      )
    )

    const { result } = renderHook(() => useConversationChat("task-1"))

    await act(async () => {
      await result.current.send("hello")
    })

    const messages = getSessionMessages("test-session-1")
    expect(messages).toHaveLength(2)
    expect(messages[0]!.role).toBe("user")
    expect(messages[1]!.role).toBe("assistant")
    expect(messages[1]!.content).toBe("你好，世界")
  })

  it("收到 session_created 事件时应触发 onSessionCreated 回调", async () => {
    const onSessionCreated = vi.fn()
    const newSessionId = "new-session-42"

    mockSendChatMessage.mockResolvedValue(
      createSseResponse(
        { type: "session_created", session_id: newSessionId },
        { type: "delta", content: "回复内容" }
      )
    )

    const { result } = renderHook(() =>
      useConversationChat("task-1", { onSessionCreated })
    )

    await act(async () => {
      await result.current.send("hello")
    })

    expect(onSessionCreated).toHaveBeenCalledTimes(1)
    expect(onSessionCreated).toHaveBeenCalledWith(newSessionId)
  })

  it("新会话场景下 session_created 更新 sessionRef，后续 delta 归属正确 session", async () => {
    conversationStore.setState({ currentSessionId: null })

    const newSessionId = "brand-new-session"

    mockSendChatMessage.mockResolvedValue(
      createSseResponse(
        { type: "session_created", session_id: newSessionId },
        { type: "delta", content: "AI 回复" }
      )
    )

    const { result } = renderHook(() => useConversationChat("task-1"))

    await act(async () => {
      await result.current.send("新会话消息")
    })

    // 临时 key 下的消息在 session_created 后整体迁移到 newSessionId，并在完成后清理临时 key
    const newSessionMessages = getSessionMessages(newSessionId)
    expect(newSessionMessages).toHaveLength(2)
    expect(newSessionMessages[0]!.role).toBe("user")
    expect(newSessionMessages[0]!.content).toBe("新会话消息")
    expect(newSessionMessages[1]!.role).toBe("assistant")
    expect(newSessionMessages[1]!.content).toBe("AI 回复")

    // 临时 "" key 消息已清理
    const emptyKeyMessages = getSessionMessages("")
    expect(emptyKeyMessages).toHaveLength(0)
  })

  it("发送完成后 isStreaming 为 false", async () => {
    mockSendChatMessage.mockResolvedValue(createEmptyResponse())

    const { result } = renderHook(() => useConversationChat("task-1"))

    await act(async () => {
      await result.current.send("test")
    })

    expect(result.current.isStreaming).toBe(false)
  })

  it("请求参数中应包含 script_task_id 和 session_id", async () => {
    conversationStore.setState({ currentSessionId: "existing-session" })
    mockSendChatMessage.mockResolvedValue(createEmptyResponse())

    const { result } = renderHook(() => useConversationChat("task-abc"))

    await act(async () => {
      await result.current.send("消息内容", {
        current_teacher_handout: "讲义内容",
        current_teacher_explanation: "讲解内容",
      })
    })

    expect(mockSendChatMessage).toHaveBeenCalledTimes(1)
    expect(mockSendChatMessage).toHaveBeenCalledWith({
      script_task_id: "task-abc",
      session_id: "existing-session",
      message: "消息内容",
      current_teacher_handout: "讲义内容",
      current_teacher_explanation: "讲解内容",
    })
  })

  it("处理 thinking 事件及 parsed.message 事件", async () => {
    mockSendChatMessage.mockResolvedValue(
      createSseResponse(
        { type: "thinking", content: "正在思考解题思路..." },
        { message: "直接结果消息" }
      )
    )

    const { result } = renderHook(() => useConversationChat("task-1"))

    await act(async () => {
      await result.current.send("请分析题目")
    })

    const messages = getSessionMessages("test-session-1")
    expect(messages).toHaveLength(2)
    expect(messages[1]!.thinking).toBe("正在思考解题思路...")
    expect(messages[1]!.content).toBe("直接结果消息")
  })

  it("当发生网络错误时应移除 assistant 占位消息并抛出异常", async () => {
    mockSendChatMessage.mockRejectedValue(new Error("Network Error"))

    const { result } = renderHook(() => useConversationChat("task-1"))

    await act(async () => {
      await expect(result.current.send("bad request")).rejects.toThrow("Network Error")
    })

    expect(result.current.isStreaming).toBe(false)
  })

  it("调用 abort 应中止当前请求 Controller", async () => {
    mockSendChatMessage.mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => useConversationChat("task-1"))

    act(() => {
      result.current.send("pending request")
    })

    expect(result.current.isStreaming).toBe(true)

    act(() => {
      result.current.abort()
    })
  })
})
