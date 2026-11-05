import { eduaiApi } from "@/services/http"
import type {
  ScriptSubmitReq,
  ScriptTaskListDesc,
  UpdateScriptResultReq,
} from "./script.types"
import type { ApiResponse, TaskInfo } from "./shared"

/* ── 脚本生成任务 ── */

/** 提交题目讲解视频脚本生成任务 */
export async function submitScriptTask(req: ScriptSubmitReq): Promise<string> {
  const { data } = await eduaiApi
    .post("/eduvideo/v0/script", {
      json: req,
    })
    .json<ApiResponse<string>>()
  return data
}

/** 获取脚本任务列表 */
export async function listScriptTasks(
  limit = 20,
  offset = 0
): Promise<ScriptTaskListDesc> {
  const { data } = await eduaiApi
    .get("/eduvideo/v0/script", {
      searchParams: { limit, offset },
    })
    .json<ApiResponse<ScriptTaskListDesc>>()
  return data
}

/** 查询脚本任务状态 */
export async function getScriptTaskStatus(taskId: string): Promise<TaskInfo> {
  const { data } = await eduaiApi
    .get(`/eduvideo/v0/script/${taskId}`)
    .json<ApiResponse<TaskInfo>>()
  return data
}

/** 重试脚本任务 */
export async function retryScriptTask(taskId: string): Promise<string> {
  const { data } = await eduaiApi
    .post(`/eduvideo/v0/script/${taskId}`)
    .json<ApiResponse<string>>()
  return data
}

/** 删除脚本任务 */
export async function deleteScriptTask(taskId: string): Promise<void> {
  await eduaiApi.delete(`/eduvideo/v0/script/${taskId}`).json<ApiResponse<null>>()
}

/** 更新脚本任务结果（用于编辑后保存） */
export async function updateScriptTaskResult(
  taskId: string,
  req: UpdateScriptResultReq
): Promise<void> {
  await eduaiApi
    .put(`/eduvideo/v0/script/${taskId}/result`, {
      json: req,
    })
    .json<ApiResponse<null>>()
}
