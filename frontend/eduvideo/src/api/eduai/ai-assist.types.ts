export interface StepContext {
  title: string
  breakdown: string
  summary: string
}

export interface FullContext {
  question_stem?: string
  options?: string[]
  steps?: StepContext[]
  active_step_index?: number
}

export interface AIEditReq {
  script_task_id?: string
  field_type: "question_stem" | "step_title" | "step_breakdown" | "step_summary" | "option" | string
  mode: "format_fix" | "condense" | "logic_check" | "custom"
  custom_prompt?: string
  current_content: string
  selected_text?: string
  context?: FullContext
}

export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
}

export interface AIEditData {
  suggested_content: string
  change_summary: string
  syntax_valid: boolean
  token_usage: TokenUsage
}

export interface AIEditResp {
  code: number
  message: string
  data: AIEditData
}

export type AIEditStreamChunk =
  | { type: "delta"; content: string }
  | {
      type: "done"
      suggested_content: string
      change_summary: string
      syntax_valid: boolean
      token_usage: TokenUsage
    }
  | { type: "error"; message: string }

export interface AIImageEditReq {
  script_task_id?: string
  image_url: string
  prompt: string
}

export interface AIImageEditData {
  new_image_url: string
  change_summary: string
}

export interface AIImageEditResp {
  code: number
  message: string
  data: AIImageEditData
}


