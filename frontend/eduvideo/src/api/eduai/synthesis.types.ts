import type { TaskStatusEnum, VideoExportDesc } from "./shared"

/* ── 模板 ── */

export interface CreateTemplateReq {
  name: string
  template: VideoExportDesc
}

export interface UpdateTemplateReq {
  name?: string | null
  template?: VideoExportDesc | null
}

export interface TemplateInfo {
  id: string
  name: string
  template: VideoExportDesc
  created_at: string
}

/* ── 合成任务 ── */

export interface SubmitVideoSynthesisReq {
  script_id: string
  export_settings: VideoExportDesc
}

export interface SynthesisTaskInfo {
  id: string
  status: TaskStatusEnum
  progress: number
  message?: string
  created_at: string
  video_url: string
}

export interface SynthesisTaskListDesc {
  infos: SynthesisTaskInfo[]
  total: number
}
