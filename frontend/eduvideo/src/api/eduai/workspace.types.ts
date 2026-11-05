import type { ItemType, TaskStatusEnum } from "./shared"

export interface CreateFolderReq {
  name: string
  parent_id?: string | null
}

export interface RenameFolderReq {
  name: string
}

export interface MoveItemInfo {
  item_type: ItemType
  item_id: string
}

export interface MoveItemReq {
  items: MoveItemInfo[]
  target_folder_id?: string | null
}

export interface WorkspaceFolderInfo {
  item_type: "folder"
  id: string
  name: string
  parent_id?: string | null
  created_at: string
  /** 子项数量，默认 0 */
  items_count?: number
}

export interface WorkspaceScriptTaskInfo {
  item_type: "script"
  id: string
  status: TaskStatusEnum
  progress: number
  message?: string
  created_at: string
  text: string
  title: string
}

export type WorkspaceItem = WorkspaceFolderInfo | WorkspaceScriptTaskInfo

export interface WorkspaceListDesc {
  items: WorkspaceItem[]
  total: number
  /** 当前文件夹名称，根目录时为空字符串 */
  folder_name: string
}
