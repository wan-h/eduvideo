import type { LanguageType, ModelProvider, SubjectType } from "./shared"

/* ── 语音克隆 ── */

export interface VoiceCloneReq {
  name: string
  text: string
  audio: File
  provider?: ModelProvider
}

export interface VoiceCloneDesc {
  id: string
  name: string
  voice_id: string
  created_at: string
}

/* ── 基础语音 ── */

export interface VoiceDesc {
  label: string
  url: string
  language: LanguageType
  voice: string
}

/* ── TTS 任务 ── */

export interface TtsSubmitReq {
  text: string
  voice: string
  speed?: number
  skip_translate?: boolean
  subject: SubjectType
  language: LanguageType
  script_id: string
}

/* ── TTSEdit 编辑提示 ── */

/** 编辑提示文本列表 */
export type EditTips = string[]
