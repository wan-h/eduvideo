import { eduaiApi } from "@/services/http"
import type { ApiResponse } from "../types"
import type { AIEditData, AIEditReq, AIEditStreamChunk } from "./ai-assist.types"

/** POST /eduvideo/v0/ai_assist/edit — Studio 富文本 AI 局部编辑 (非流式/兼容) */
export async function requestAIEdit(req: AIEditReq): Promise<AIEditData> {
  const { data } = await eduaiApi
    .post("/eduvideo/v0/ai_assist/edit", {
      json: req,
    })
    .json<ApiResponse<AIEditData>>()
  return data
}

/** POST /eduvideo/v0/ai_assist/edit — Studio 富文本 AI 局部编辑 (SSE 流式) */
export async function requestAIEditStream(
  req: AIEditReq,
  onChunk: (chunk: AIEditStreamChunk) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await eduaiApi.post("/eduvideo/v0/ai_assist/edit", {
    json: req,
    signal,
    timeout: false,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  if (!response.body) {
    throw new Error("Response body is empty")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("data:")) continue

      const dataStr = trimmed.slice(5).trim()
      if (!dataStr) continue

      try {
        const chunk = JSON.parse(dataStr) as AIEditStreamChunk
        onChunk(chunk)
      } catch (err) {
        console.error("Failed to parse SSE chunk:", err, dataStr)
      }
    }
  }
}

/** POST /eduvideo/v0/ai_assist/edit_image — 图片编辑魔法棒 */
export async function requestAIImageEdit(req: {
  script_task_id?: string
  image_url: string
  prompt: string
}): Promise<{ new_image_url: string; change_summary: string }> {
  const { data } = await eduaiApi
    .post("/eduvideo/v0/ai_assist/edit_image", {
      json: req,
      // 图片生成耗时较长，覆盖默认 30s 超时
      timeout: 180000,
    })
    .json<ApiResponse<{ new_image_url: string; change_summary: string }>>()
  return data
}

