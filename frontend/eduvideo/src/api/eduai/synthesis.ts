import { eduaiApi } from "@/services/http"
import type { ApiResponse, TaskInfo } from "./shared"
import type {
  CreateTemplateReq,
  SubmitVideoSynthesisReq,
  SynthesisTaskListDesc,
  TemplateInfo,
  UpdateTemplateReq,
} from "./synthesis.types"

/* ── 导出模板 ── */

/** 创建导出模板 */
export async function createExportTemplate(
  req: CreateTemplateReq
): Promise<TemplateInfo[]> {
  const { data } = await eduaiApi
    .post("/eduvideo/v0/synthesis/template", {
      json: req,
    })
    .json<ApiResponse<TemplateInfo[]>>()
  return data
}

/** 根据 ID 获取导出模板 */
export async function getExportTemplate(
  templateId: string
): Promise<TemplateInfo[]> {
  const { data } = await eduaiApi
    .get(`/eduvideo/v0/synthesis/template/${templateId}`)
    .json<ApiResponse<TemplateInfo[]>>()
  return data
}

/** 获取导出模板列表 */
export async function listExportTemplates(): Promise<TemplateInfo[]> {
  const { data } = await eduaiApi
    .get("/eduvideo/v0/synthesis/template")
    .json<ApiResponse<TemplateInfo[]>>()
  return data
}

/** 更新导出模板 */
export async function updateExportTemplate(
  templateId: string,
  req: UpdateTemplateReq
): Promise<void> {
  await eduaiApi
    .put(`/eduvideo/v0/synthesis/template/${templateId}`, {
      json: req,
    })
    .json<ApiResponse<null>>()
}

/** 删除导出模板 */
export async function deleteExportTemplate(templateId: string): Promise<void> {
  await eduaiApi
    .delete(`/eduvideo/v0/synthesis/template/${templateId}`)
    .json<ApiResponse<null>>()
}

/* ── 视频合成任务 ── */

/** 提交视频合成任务 */
export async function submitSynthesisTask(
  req: SubmitVideoSynthesisReq
): Promise<string> {
  const { data } = await eduaiApi
    .post("/eduvideo/v0/synthesis", {
      json: req,
    })
    .json<ApiResponse<string>>()
  return data
}

/** 获取视频合成任务列表 */
export async function listSynthesisTasks(
  scriptId: string,
  limit = 20,
  offset = 0
): Promise<SynthesisTaskListDesc> {
  const { data } = await eduaiApi
    .get(`/eduvideo/v0/synthesis/${scriptId}`, {
      searchParams: { limit, offset },
    })
    .json<ApiResponse<SynthesisTaskListDesc>>()
  return data
}

/** 查询视频合成任务状态 */
export async function getSynthesisTaskStatus(
  scriptId: string,
  synthesisId: string
): Promise<TaskInfo> {
  const { data } = await eduaiApi
    .get(`/eduvideo/v0/synthesis/${scriptId}/${synthesisId}`)
    .json<ApiResponse<TaskInfo>>()
  return data
}
