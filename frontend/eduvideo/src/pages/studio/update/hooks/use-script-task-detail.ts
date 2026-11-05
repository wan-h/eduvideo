import { getScriptTaskStatus } from "@/api/eduai/script"
import { queryKeys } from "@/services/query-client"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import type { RawVideoData } from "../types"
import { rawVideoDataSchema } from "../types"

interface UseScriptTaskDetailResult {
  data: RawVideoData | null
  isLoading: boolean
  /** 原始错误对象，调用方可通过 instanceof 判断具体类型 */
  error: Error | null
}

/** data.request 完整结构，对应 ScriptSubmitReq */
interface RequestMeta {
  text?: string
  urls?: string[]
  voice?: string
  stage?: string
  language?: string
}

function parseRequestMeta(request: string): RequestMeta {
  try {
    const parsed = JSON.parse(request) as Record<string, unknown>
    return {
      text: typeof parsed.text === "string" ? parsed.text : undefined,
      urls: Array.isArray(parsed.urls)
        ? parsed.urls.filter((u): u is string => typeof u === "string")
        : undefined,
      voice: typeof parsed.voice === "string" ? parsed.voice : undefined,
      stage: typeof parsed.stage === "string" ? parsed.stage : undefined,
      language:
        typeof parsed.language === "string" ? parsed.language : undefined,
    }
  } catch {
    return {}
  }
}

async function fetchAndValidate(taskId: string): Promise<RawVideoData> {
  try {
    const status = await getScriptTaskStatus(taskId)
    if (!status.result) {
      throw new Error("任务结果为空")
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(status.result)
    } catch {
      throw new Error("任务结果 JSON 解析失败")
    }

    const parseResult = rawVideoDataSchema.safeParse(parsed)
    if (!parseResult.success) {
      console.error("[schema validation]", parseResult.error.issues)
      throw new Error("任务数据格式校验失败")
    }

    // 从原始请求中提取用户选择的 voice 和 language，覆盖 AI 生成结果中的值
    const requestMeta = parseRequestMeta(status.request)
    if (requestMeta.voice) {
      parseResult.data.question_metadata.voice = requestMeta.voice
    }
    if (requestMeta.language) {
      parseResult.data.question_metadata.language = requestMeta.language
    }

    return parseResult.data
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "获取任务详情失败，请稍后重试"
    toast.error(message)
    throw err
  }
}

export function useScriptTaskDetail(
  taskId: string | undefined
): UseScriptTaskDetailResult {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.scripts.detail(taskId ?? ""),
    queryFn: () => fetchAndValidate(taskId!),
    enabled: !!taskId,
    staleTime: 0,
  })

  return {
    data: data ?? null,
    isLoading,
    error:
      error instanceof Error ? error : error ? new Error(String(error)) : null,
  }
}
