import { eduaiApi } from "@/services/http"
import { toFormData } from "@/utils/form-data"
import type { ApiResponse, TaskInfo } from "./shared"
import type {
  EditTips,
  TtsSubmitReq,
  VoiceCloneDesc,
  VoiceCloneReq,
  VoiceDesc,
} from "./tts.types"

/* ── 语音克隆 ── */

/** 提交语音克隆任务 */
export async function voiceClone(req: VoiceCloneReq): Promise<string> {
  const { data } = await eduaiApi
    .post("/eduvideo/v0/tts/clone", {
      body: toFormData(req),
    })
    .json<ApiResponse<string>>()
  return data
}

/** 获取克隆语音列表 */
export async function listClonedVoices(): Promise<VoiceCloneDesc[]> {
  const { data } = await eduaiApi
    .get("/eduvideo/v0/tts/clone/voices")
    .json<ApiResponse<VoiceCloneDesc[]>>()
  return data
}

/* ── 预置语音 ── */

/** 获取支持的语音列表 */
export async function listSupportedVoices(): Promise<VoiceDesc[]> {
  const { data } = await eduaiApi
    .get("/eduvideo/v0/tts/voices")
    .json<ApiResponse<VoiceDesc[]>>()
  return data
}

/* ── TTS 任务 ── */

/** 提交 TTS 语音合成任务 */
export async function submitTtsTask(req: TtsSubmitReq): Promise<string> {
  const { data } = await eduaiApi
    .post("/eduvideo/v0/tts", {
      json: req,
    })
    .json<ApiResponse<string>>()
  return data
}

/** 查询 TTS 任务状态 */
export async function getTtsTaskStatus(taskId: string): Promise<TaskInfo> {
  const { data } = await eduaiApi
    .get(`/eduvideo/v0/tts/${taskId}`)
    .json<ApiResponse<TaskInfo>>()
  return data
}

/* ── TTSEdit 编辑提示 ── */

/** GET /eduvideo/v0/ttsedit/tips — 获取编辑提示 */
export async function getEditTips(): Promise<EditTips> {
  const { data } = await eduaiApi
    .get("/eduvideo/v0/ttsedit/tips")
    .json<ApiResponse<EditTips>>()
  return data
}
