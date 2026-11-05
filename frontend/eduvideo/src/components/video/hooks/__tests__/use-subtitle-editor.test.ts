// @vitest-environment happy-dom
import type { FeScene } from "@ask2vid/shared"
import type { PlayerRef } from "@remotion/player"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useQuestionMetadataStore } from "../../store/question-metadata-store"
import { useSceneStore } from "../../store/scene-store"
import { useSubtitleEditor } from "../use-subtitle-editor"

const mockSubmitTtsTask = vi.fn()
const mockGetTtsTaskStatus = vi.fn()

vi.mock("@/api/eduai/tts", () => ({
  submitTtsTask: (...args: unknown[]) => mockSubmitTtsTask(...args),
  getTtsTaskStatus: (...args: unknown[]) => mockGetTtsTaskStatus(...args),
}))

const STATUS_COMPLETED = 10
const STATUS_FAILED = -1

function makeScene(): FeScene {
  return {
    id: "scene-1",
    sceneType: "question_solution",
    segments: [
      {
        id: "seg-1",
        title: "",
        content: "",
        subtitles: [{ id: "sub-1", text: "原始文案", audio: "", duration: 0 }],
      },
    ],
  }
}

function makePlayerRef(): React.RefObject<PlayerRef | null> {
  return {
    current: {
      isPlaying: vi.fn(() => false),
      pause: vi.fn(),
      seekTo: vi.fn(),
      play: vi.fn(),
      getCurrentFrame: vi.fn(() => 0),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  } as unknown as React.RefObject<PlayerRef | null>
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

/**
 * 获取 store 中字幕的当前文案
 */
function getSubtitleText(): string {
  return (
    useSceneStore
      .getState()
      .scenes[0]?.segments[0]?.subtitles.find((s) => s.id === "sub-1")?.text ??
    ""
  )
}

describe("useSubtitleEditor — 保存时 TTS 失败应回退文案", () => {
  it("TTS 提交失败时，文案应回退到原始值", async () => {
    // TTS 提交失败
    mockSubmitTtsTask.mockRejectedValue(new Error("网络错误"))

    const playerRef = makePlayerRef()
    const { result } = renderHook(() =>
      useSubtitleEditor(playerRef, new Map(), "script-001")
    )

    // 启动编辑
    await act(async () => {
      result.current.handleStartEdit("sub-1", "原始文案")
    })

    // 修改文案
    await act(async () => {
      result.current.handleEditTextChange("sub-1", "修改后的文案")
    })

    // 保存 — 此时 TTS 会失败
    await act(async () => {
      result.current.handleSaveEdit("sub-1")
    })

    // 推进 timer 确保异步操作完成
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // 断言：store 中文案应回退到原始值
    expect(getSubtitleText()).toBe("原始文案")
  })

  it("TTS 轮询返回失败状态时，文案应回退到原始值", async () => {
    mockSubmitTtsTask.mockResolvedValue("task-fail")
    mockGetTtsTaskStatus.mockResolvedValue({
      status: STATUS_FAILED,
      message: "服务端合成失败",
    })

    const playerRef = makePlayerRef()
    const { result } = renderHook(() =>
      useSubtitleEditor(playerRef, new Map(), "script-001")
    )

    await act(async () => {
      result.current.handleStartEdit("sub-1", "原始文案")
    })

    await act(async () => {
      result.current.handleEditTextChange("sub-1", "新文案ABC")
    })

    await act(async () => {
      result.current.handleSaveEdit("sub-1")
    })

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(getSubtitleText()).toBe("原始文案")
  })

  it("TTS 轮询超时时，文案应回退到原始值", async () => {
    mockSubmitTtsTask.mockResolvedValue("task-timeout")
    // 始终返回未完成状态，触发超时
    mockGetTtsTaskStatus.mockResolvedValue({
      status: 5, // 进行中
    })

    const playerRef = makePlayerRef()
    const { result } = renderHook(() =>
      useSubtitleEditor(playerRef, new Map(), "script-001")
    )

    await act(async () => {
      result.current.handleStartEdit("sub-1", "原始文案")
    })

    await act(async () => {
      result.current.handleEditTextChange("sub-1", "超时测试文案")
    })

    await act(async () => {
      result.current.handleSaveEdit("sub-1")
    })

    // 推进所有 timer（包含轮询超时）
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(getSubtitleText()).toBe("原始文案")
  })

  it("TTS 成功时，文案应保持更新后的值", async () => {
    mockSubmitTtsTask.mockResolvedValue("task-ok")
    mockGetTtsTaskStatus.mockResolvedValue({
      status: STATUS_COMPLETED,
      result: JSON.stringify({ url: "http://audio.mp3", duration: 2000 }),
    })

    const playerRef = makePlayerRef()
    const { result } = renderHook(() =>
      useSubtitleEditor(playerRef, new Map(), "script-001")
    )

    await act(async () => {
      result.current.handleStartEdit("sub-1", "原始文案")
    })

    await act(async () => {
      result.current.handleEditTextChange("sub-1", "成功文案")
    })

    await act(async () => {
      result.current.handleSaveEdit("sub-1")
    })

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(getSubtitleText()).toBe("成功文案")
  })

  it("文案未变化时保存，不应触发 TTS", async () => {
    const playerRef = makePlayerRef()
    const { result } = renderHook(() =>
      useSubtitleEditor(playerRef, new Map(), "script-001")
    )

    await act(async () => {
      result.current.handleStartEdit("sub-1", "原始文案")
    })

    // 未修改文案直接保存
    await act(async () => {
      result.current.handleSaveEdit("sub-1")
    })

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // TTS 不应被调用
    expect(mockSubmitTtsTask).not.toHaveBeenCalled()
    // 文案保持原样
    expect(getSubtitleText()).toBe("原始文案")
  })
})
