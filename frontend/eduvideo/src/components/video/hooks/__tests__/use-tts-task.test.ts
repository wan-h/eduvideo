// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useTtsTask } from "../use-tts-task"

const mockSubmitTtsTask = vi.fn()

vi.mock("@/api/eduai/tts", () => ({
  submitTtsTask: (...args: unknown[]) => mockSubmitTtsTask(...args),
  getTtsTaskStatus: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useTtsTask", () => {
  it("options 变化时 ref 应同步更新，submit 使用最新的 voice/language", async () => {
    vi.useFakeTimers()
    mockSubmitTtsTask.mockResolvedValue("task-001")

    // 第一次渲染：English voice
    const { result, rerender } = renderHook(
      ({ voice, language }) =>
        useTtsTask({
          voice,
          language,
          subject: "physics",
          scriptId: "script-001",
        }),
      {
        initialProps: {
          voice: "en_female_american",
          language: "english",
        },
      }
    )

    await act(async () => {
      result.current.submit("sub-1", "Hello world")
    })

    // 第二次渲染：切换到 Chinese voice/language
    rerender({
      voice: "zh_female_qingxin",
      language: "chinese",
    })

    await act(async () => {
      result.current.submit("sub-2", "你好世界")
    })

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // 验证第二次 submit 使用了新的 voice 和 language
    const calls = mockSubmitTtsTask.mock.calls
    expect(calls).toHaveLength(2)

    const firstCall = calls[0]![0] as {
      voice: string
      language: string
    }
    const secondCall = calls[1]![0] as {
      voice: string
      language: string
    }

    expect(firstCall.voice).toBe("en_female_american")
    expect(firstCall.language).toBe("english")

    // 这是核心断言：第二次调用应使用更新后的值
    expect(secondCall.voice).toBe("zh_female_qingxin")
    expect(secondCall.language).toBe("chinese")
  })
})
