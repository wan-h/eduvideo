/** @vitest-environment happy-dom */

import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useScriptSubmit } from "../use-script-submit"

const mockNavigate = vi.fn()
const mockSubmitTask = vi.fn()

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/api/eduai/script", () => ({
  submitScriptTask: (...args: unknown[]) => mockSubmitTask(...args),
}))

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "toast-1"),
    success: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn((p: Promise<unknown>) => p),
  },
}))

describe("useScriptSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("isLoading is false initially", () => {
    const { result } = renderHook(() => useScriptSubmit())
    expect(result.current.isLoading).toBe(false)
  })

  it("calls API, navigates to /studio on success when no folder_id", async () => {
    mockSubmitTask.mockResolvedValueOnce({ id: "task-1" })

    const { result } = renderHook(() => useScriptSubmit())

    // Start submit - the setTimeout(1000) will block completion
    const submitPromise = result.current.submit({
      text: "test",
      urls: [],
      stage: "senior",
      language: "chinese",
    })

    // Advance past the 1000ms delay
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    await submitPromise

    expect(mockSubmitTask).toHaveBeenCalledWith({
      text: "test",
      urls: [],
      stage: "senior",
      language: "chinese",
    })
    expect(mockNavigate).toHaveBeenCalledWith("/studio")
  })

  it("navigates to folder when folder_id is provided", async () => {
    mockSubmitTask.mockResolvedValueOnce({ id: "task-2" })

    const { result } = renderHook(() => useScriptSubmit())

    const submitPromise = result.current.submit({
      text: "test",
      urls: [],
      stage: "senior",
      language: "chinese",
      folder_id: "folder-abc",
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    await submitPromise

    expect(mockNavigate).toHaveBeenCalledWith("/studio?fid=folder-abc")
  })

  it("does not navigate on API failure", async () => {
    mockSubmitTask.mockRejectedValueOnce(new Error("Server error"))

    const { result } = renderHook(() => useScriptSubmit())

    await act(async () => {
      await result.current
        .submit({
          text: "test",
          urls: [],
          stage: "senior",
          language: "chinese",
        })
        .catch(() => {})
    })

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })
})
