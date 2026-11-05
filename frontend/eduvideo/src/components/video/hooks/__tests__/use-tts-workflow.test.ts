// @vitest-environment happy-dom
import type { FeScene } from "@ask2vid/shared"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useQuestionMetadataStore } from "../../store/question-metadata-store"
import { useSceneStore } from "../../store/scene-store"
import { useTtsWorkflow } from "../use-tts-workflow"

const mockSubmitTtsTask = vi.fn()
const mockGetTtsTaskStatus = vi.fn()

vi.mock("@/api/eduai/tts", () => ({
  submitTtsTask: (...args: unknown[]) => mockSubmitTtsTask(...args),
  getTtsTaskStatus: (...args: unknown[]) => mockGetTtsTaskStatus(...args),
}))

const STATUS_COMPLETED = 10

function makeScene(): FeScene {
  return {
    id: "scene-1",
    sceneType: "question_solution",
    segments: [
      {
        id: "seg-1",
        title: "",
        content: "",
        subtitles: [{ id: "sub-1", text: "你好", audio: "", duration: 0 }],
      },
    ],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  useSceneStore.getState().initialize([makeScene()])
  useQuestionMetadataStore.getState().initialize({
    title: "",
    type: "",
    level: "",
    subject: "math",
    stage: "",
    knowledge_points: [],
    voice: "voice-001",
    language: "chinese",
    video_synthesis_template_id: null,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useTtsWorkflow", () => {
  it("初始状态为 idle", () => {
    const { result } = renderHook(() =>
      useTtsWorkflow("scene-1", "seg-1", "script-001")
    )
    expect(result.current.state["sub-1"]?.status).toBeUndefined()
  })

  it("trigger 后状态变为 generating", async () => {
    mockSubmitTtsTask.mockResolvedValue("task-123")
    const { result } = renderHook(() =>
      useTtsWorkflow("scene-1", "seg-1", "script-001")
    )

    await act(async () => {
      result.current.trigger("sub-1", "测试文本")
    })

    expect(result.current.state["sub-1"]?.status).toBe("generating")
  })

  it("任务完成后状态变为 done 并更新 subtitle store", async () => {
    mockSubmitTtsTask.mockResolvedValue("task-456")
    mockGetTtsTaskStatus.mockResolvedValue({
      status: STATUS_COMPLETED,
      result: JSON.stringify({
        url: "http://audio.mp3",
        duration: 2000,
      }),
    })

    const { result } = renderHook(() =>
      useTtsWorkflow("scene-1", "seg-1", "script-001")
    )

    await act(async () => {
      result.current.trigger("sub-1", "测试文本")
    })

    // 推进所有计时器
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(result.current.state["sub-1"]?.status).toBe("done")

    const subtitle = useSceneStore
      .getState()
      .scenes[0].segments[0].subtitles.find((s) => s.id === "sub-1")
    expect(subtitle?.audio).toBe("http://audio.mp3")
    expect(subtitle?.duration).toBe(2000)
  })

  it("isGenerating 返回正确的生成状态", async () => {
    mockSubmitTtsTask.mockResolvedValue("task-789")
    const { result } = renderHook(() =>
      useTtsWorkflow("scene-1", "seg-1", "script-001")
    )

    expect(result.current.isGenerating("sub-1")).toBe(false)

    await act(async () => {
      result.current.trigger("sub-1", "测试文本")
    })

    expect(result.current.isGenerating("sub-1")).toBe(true)
  })
})
