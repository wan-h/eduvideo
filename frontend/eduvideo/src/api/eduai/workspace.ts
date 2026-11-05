import { eduaiApi } from "@/services/http"
import type { ApiResponse, TaskStatusEnum } from "./shared"
import type {
  CreateFolderReq,
  MoveItemReq,
  RenameFolderReq,
  WorkspaceListDesc,
} from "./workspace.types"

/* ── 文件夹管理 ── */

/** 创建文件夹 */
export async function createFolder(req: CreateFolderReq): Promise<void> {
  await eduaiApi
    .post("/eduvideo/v0/workspace/folder", {
      json: req,
    })
    .json<ApiResponse<null>>()
}

/** 重命名文件夹 */
export async function renameFolder(
  folderId: string,
  req: RenameFolderReq
): Promise<void> {
  await eduaiApi
    .put(`/eduvideo/v0/workspace/folder/${folderId}`, { json: req })
    .json<ApiResponse<null>>()
}

/** 删除文件夹 */
export async function deleteFolder(
  folderId: string,
  deleteAll = false
): Promise<void> {
  await eduaiApi
    .delete(`/eduvideo/v0/workspace/folder/${folderId}`, {
      searchParams: { delete_all: deleteAll },
    })
    .json<ApiResponse<null>>()
}

/* ── 移动 ── */

/** 移动文件夹或脚本 */
export async function moveItem(req: MoveItemReq): Promise<void> {
  await eduaiApi
    .put("/eduvideo/v0/workspace/move", {
      json: req,
    })
    .json<ApiResponse<null>>()
}

/* ── 工作空间内容 ── */

/** 获取工作空间内容 */
export async function getWorkspace(params?: {
  folder_id?: string | null
  item_type?: "folder" | "script" | "all"
  fuzzy_search?: string
  status?: TaskStatusEnum | null
  limit?: number
  offset?: number
}): Promise<WorkspaceListDesc> {
  const { data } = await eduaiApi
    .get("/eduvideo/v0/workspace", {
      searchParams: {
        folder_id: params?.folder_id ?? undefined,
        item_type: params?.item_type ?? "all",
        fuzzy_search: params?.fuzzy_search ?? undefined,
        status: params?.status ?? undefined,
        limit: params?.limit ?? 20,
        offset: params?.offset ?? 0,
      },
    })
    .json<ApiResponse<WorkspaceListDesc>>()
  return data
}
