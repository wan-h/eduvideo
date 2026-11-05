/** @vitest-environment happy-dom */

import { createQueryWrapper } from "@/lib/test-utils"
import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useShareVideos } from "../use-share-videos"

const mockGetShareVideos = vi.fn()

vi.mock("@/api/eduai/common", () => ({
  getShareVideos: (...args: unknown[]) => mockGetShareVideos(...args),
}))

const mockVideos = [
  { url: "https://example.com/1.mp4", title: "Video 1" },
  { url: "https://example.com/2.mp4", title: "Video 2" },
]

describe("useShareVideos", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetShareVideos.mockResolvedValue(mockVideos)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns isLoading=true initially", () => {
    const { result } = renderHook(() => useShareVideos(), {
      wrapper: createQueryWrapper(),
    })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.videos).toEqual([])
  })

  it("returns videos after fetch succeeds", async () => {
    const { result } = renderHook(() => useShareVideos(), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.videos).toEqual(mockVideos)
    expect(result.current.error).toBeNull()
  })

  it("returns error on fetch failure", async () => {
    mockGetShareVideos.mockRejectedValue(new Error("Network error"))

    const { result } = renderHook(() => useShareVideos(), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).not.toBeNull()
    expect(result.current.error?.message).toBe("Network error")
  })
})
