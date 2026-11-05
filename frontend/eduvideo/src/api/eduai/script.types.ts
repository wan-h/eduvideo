import type { LanguageType, StageType, TaskStatusEnum } from "./shared"

export interface ScriptSubmitReq {
  text: string
  urls?: string[]
  stage: StageType
  language: LanguageType
  voice?: string
  folder_id?: string
}

export interface UpdateScriptResultReq {
  script: string
}

export interface ScriptTaskInfo {
  id: string
  status: TaskStatusEnum
  progress: number
  message?: string
  created_at: string
  text: string
  title: string
}

export interface ScriptTaskListDesc {
  infos: ScriptTaskInfo[]
  total: number
}
