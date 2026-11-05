// eduai API 共享枚举与基础类型

export type TaskStatusEnum = 0 | 1 | 2 | 3 | 4 | 10 | 20 | 30

export type LanguageType = "chinese" | "english"

export type StageType = "elementary" | "junior" | "senior" | "university"

export type SubjectType =
  | "chinese"
  | "math"
  | "english"
  | "chemistry"
  | "physics"
  | "biology"
  | "history"
  | "geography"
  | "political"
  | "other"

export type TaskType =
  | "doc_parse"
  | "readable_tts"
  | "question_extract"
  | "question_solve"
  | "question_parse"
  | "question_explanation_video_gen_script"
  | "question_explanation_video_gen_synthesis"
  | "question_explanation_video_gen_script_synthesis"

export type ModelProvider =
  "openai" | "aliyun" | "minimax" | "custom" | "mineru"

export type VideoResolutionType = "720p" | "1080p" | "2K"

export type ItemType = "folder" | "script"

export type { ApiResponse } from "../types"

export interface TaskInfo {
  id: string
  request: string
  status: TaskStatusEnum
  progress: number
  result?: string
  message?: string
  created_at: string
}

export interface VideoExportDesc {
  resolution?: VideoResolutionType
  background?: string
  opening_film?: string
  closing_film?: string
  watermark?: string
  fps?: number
  speed?: number
  page_layout?: string
}
