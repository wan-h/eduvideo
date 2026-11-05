import { eduaiApi } from "@/services/http"
import type { ApiResponse } from "../types"
import type {
  ChatReq,
  MessageListDesc,
  RenameSessionReq,
  SessionListDesc,
} from "./conversation.types"

/* ── 会话 ── */

/** 获取会话列表 */
export async function listSessions(
  scriptTaskId: string,
  limit = 20,
  offset = 0
): Promise<SessionListDesc> {
  const { data } = await eduaiApi
    .get("/eduvideo/v0/conversation/sessions", {
      searchParams: { script_task_id: scriptTaskId, limit, offset },
    })
    .json<ApiResponse<SessionListDesc>>()
  return data
}

/** 重命名会话 */
export async function renameSession(
  sessionId: string,
  req: RenameSessionReq
): Promise<void> {
  await eduaiApi
    .put(`/eduvideo/v0/conversation/sessions/${sessionId}`, {
      json: req,
    })
    .json<ApiResponse<null>>()
}

/** 删除会话 */
export async function deleteSession(sessionId: string): Promise<void> {
  await eduaiApi
    .delete(`/eduvideo/v0/conversation/sessions/${sessionId}`)
    .json<ApiResponse<null>>()
}

/* ── 消息 ── */

/** 获取会话消息列表 */
export async function listMessages(
  sessionId: string,
  limit = 100,
  offset = 0
): Promise<MessageListDesc> {
  const { data } = await eduaiApi
    .get(`/eduvideo/v0/conversation/sessions/${sessionId}/messages`, {
      searchParams: { limit, offset },
    })
    .json<ApiResponse<MessageListDesc>>()
  return data
}

/* ── 聊天（SSE 流） ── */

/** 发送聊天消息，返回 Response 供调用方读取 SSE 流 */
export async function sendChatMessage(
  req: ChatReq,
  signal?: AbortSignal
): Promise<Response> {
  return eduaiApi.post("/eduvideo/v0/conversation/chat", {
    json: req,
    signal,
    timeout: false,
  })
}
