/* ── 会话 ── */

export interface SessionInfo {
  session_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface SessionListDesc {
  sessions: SessionInfo[]
  total: number
}

/* ── 消息 ── */

export interface MessageInfo {
  message_id: string
  role: string
  content: string
  thinking?: string
  created_at: string
}

export interface MessageListDesc {
  messages: MessageInfo[]
  total: number
}

/* ── 请求体 ── */

export interface ChatReq {
  script_task_id: string
  session_id?: string | null
  message: string
  current_teacher_handout?: string
  current_teacher_explanation?: string
}

export interface RenameSessionReq {
  title: string
}
