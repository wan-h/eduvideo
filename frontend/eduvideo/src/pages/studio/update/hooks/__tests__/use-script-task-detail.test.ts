/** @vitest-environment happy-dom */

import { createQueryWrapper } from "@/lib/test-utils"
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useScriptTaskDetail } from "../use-script-task-detail"

const mockGetScriptTaskStatus = vi.fn()

vi.mock("@/api/eduai/script", () => ({
  getScriptTaskStatus: (...args: unknown[]) => mockGetScriptTaskStatus(...args),
}))

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}))

function makeValidResult(): string {
  return JSON.stringify({
    question_metadata: {
      title: "测试",
      type: "answer_question",
      level: "easy",
      subject: "math",
      stage: "junior",
      knowledge_points: [],
      voice: "ai-voice-id",
      language: "english",
      video_synthesis_template_id: null,
    },
    question_content: { stem: "题目", options: [] },
    scenes: {
      question_introduction: {
        stem: "题目",
        options: [],
        subtitles: [{ text: "你好", audio: null, duration: 1000 }],
      },
      question_solution: {
        segments: [
          {
            title: "",
            content: "解答",
            subtitles: [{ text: "步骤", audio: null, duration: 500 }],
          },
        ],
      },
      question_key_points: {
        segments: [
          {
            title: "",
            content: "考点",
            subtitles: [{ text: "总结", audio: null, duration: 500 }],
          },
        ],
      },
    },
  })
}

describe("useScriptTaskDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("does not fetch when taskId is undefined", () => {
    renderHook(() => useScriptTaskDetail(undefined), {
      wrapper: createQueryWrapper(),
    })
    expect(mockGetScriptTaskStatus).not.toHaveBeenCalled()
  })

  it("fetches with correct taskId", () => {
    mockGetScriptTaskStatus.mockReturnValue(new Promise(() => {}))

    renderHook(() => useScriptTaskDetail("task-1"), {
      wrapper: createQueryWrapper(),
    })

    expect(mockGetScriptTaskStatus).toHaveBeenCalledWith("task-1")
  })

  it("用 data.request 中的 voice/language 覆盖 result.question_metadata 的值", async () => {
    mockGetScriptTaskStatus.mockResolvedValue({
      request: JSON.stringify({
        text: "题目",
        voice: "user-chosen-voice",
        language: "chinese",
        stage: "senior",
      }),
      result: makeValidResult(),
    })

    const { result } = renderHook(() => useScriptTaskDetail("task-1"), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).not.toBeNull()
    })

    expect(result.current.data?.question_metadata.voice).toBe(
      "user-chosen-voice"
    )
    expect(result.current.data?.question_metadata.language).toBe("chinese")
  })

  it("request 解析失败时不覆盖 metadata", async () => {
    mockGetScriptTaskStatus.mockResolvedValue({
      request: "not-valid-json{{{",
      result: makeValidResult(),
    })

    const { result } = renderHook(() => useScriptTaskDetail("task-1"), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).not.toBeNull()
    })

    // 保持 result 中的原始值
    expect(result.current.data?.question_metadata.voice).toBe("ai-voice-id")
    expect(result.current.data?.question_metadata.language).toBe("english")
  })

  it("request 中无 voice/language 字段时不覆盖", async () => {
    mockGetScriptTaskStatus.mockResolvedValue({
      request: JSON.stringify({ text: "题目" }),
      result: makeValidResult(),
    })

    const { result } = renderHook(() => useScriptTaskDetail("task-1"), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).not.toBeNull()
    })

    // 保持 result 中的原始值
    expect(result.current.data?.question_metadata.voice).toBe("ai-voice-id")
    expect(result.current.data?.question_metadata.language).toBe("english")
  })

  it("当 status.result 为空时抛出 任务结果为空 错误", async () => {
    mockGetScriptTaskStatus.mockResolvedValue({
      request: "{}",
      result: "",
    })

    const { result } = renderHook(() => useScriptTaskDetail("task-1"), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })
    expect(result.current.error?.message).toBe("任务结果为空")
  })

  it("当 status.result JSON 解析失败时抛出 任务结果 JSON 解析失败 错误", async () => {
    mockGetScriptTaskStatus.mockResolvedValue({
      request: "{}",
      result: "{bad-json",
    })

    const { result } = renderHook(() => useScriptTaskDetail("task-1"), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })
    expect(result.current.error?.message).toBe("任务结果 JSON 解析失败")
  })

  it("当 Schema 校验失败时抛出 任务数据格式校验失败 错误", async () => {
    mockGetScriptTaskStatus.mockResolvedValue({
      request: "{}",
      result: JSON.stringify({ invalid: "schema" }),
    })

    const { result } = renderHook(() => useScriptTaskDetail("task-1"), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })
    expect(result.current.error?.message).toBe("任务数据格式校验失败")
  })
})
