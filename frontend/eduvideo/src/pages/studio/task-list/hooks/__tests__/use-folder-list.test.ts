/** @vitest-environment happy-dom */

import { createQueryWrapper } from "@/lib/test-utils"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFolderList } from "../use-folder-list"

const mockGetWorkspace = vi.fn()

vi.mock("@/api/eduai/workspace", () => ({
  getWorkspace: (...args: unknown[]) => mockGetWorkspace(...args),
}))

function makeFolderItem(id: string, name: string, count = 2) {
  return {
    id,
    name,
    item_type: "folder" as const,
    items_count: count,
    created_at: "2026-07-01T00:00:00Z",
    status: 0,
    is_creator: false,
  }
}

function makeWorkspaceResponse(
  items: ReturnType<typeof makeFolderItem>[],
  total: number
) {
  return { items, total, folder_name: "" }
}

describe("useFolderList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("初始加载时调用 getWorkspace，offset=0, limit=20", async () => {
    mockGetWorkspace.mockResolvedValue(makeWorkspaceResponse([], 0))

    renderHook(() => useFolderList(), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(mockGetWorkspace).toHaveBeenCalledWith({
        item_type: "folder",
        limit: 20,
        offset: 0,
      })
    })
  })

  it("返回扁平化的文件夹数据", async () => {
    mockGetWorkspace.mockResolvedValue(
      makeWorkspaceResponse(
        [makeFolderItem("f1", "数学"), makeFolderItem("f2", "语文")],
        2
      )
    )

    const { result } = renderHook(() => useFolderList(), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.folders).toHaveLength(2)
    })

    expect(result.current.folders[0].id).toBe("f1")
    expect(result.current.folders[1].id).toBe("f2")
    expect(result.current.total).toBe(2)
  })

  it("total > loaded 时 hasMore 为 true", async () => {
    mockGetWorkspace.mockResolvedValue(
      makeWorkspaceResponse(
        Array.from({ length: 20 }, (_, i) =>
          makeFolderItem(`f${i}`, `folder-${i}`)
        ),
        40
      )
    )

    const { result } = renderHook(() => useFolderList(), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true)
    })
  })

  it("loadMore 以递增的 offset 加载下一页并追加", async () => {
    const page1 = makeWorkspaceResponse(
      Array.from({ length: 20 }, (_, i) =>
        makeFolderItem(`p1-${i}`, `page1-${i}`)
      ),
      40
    )
    const page2 = makeWorkspaceResponse(
      Array.from({ length: 20 }, (_, i) =>
        makeFolderItem(`p2-${i}`, `page2-${i}`)
      ),
      40
    )

    mockGetWorkspace.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2)

    const { result } = renderHook(() => useFolderList(), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.folders).toHaveLength(20)
    })

    await act(async () => {
      result.current.loadMore()
    })

    await waitFor(() => {
      expect(result.current.folders).toHaveLength(40)
    })

    expect(mockGetWorkspace).toHaveBeenCalledTimes(2)
    expect(mockGetWorkspace).toHaveBeenLastCalledWith({
      item_type: "folder",
      limit: 20,
      offset: 20,
    })
  })

  it("搜索词变化时以新搜索词重取首页(fuzzy_search)", async () => {
    mockGetWorkspace.mockResolvedValue(makeWorkspaceResponse([], 0))

    const { result } = renderHook(() => useFolderList(), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(mockGetWorkspace).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.setSearch("数学")
    })

    // 等待防抖 300ms + query refetch
    await waitFor(
      () => {
        expect(mockGetWorkspace).toHaveBeenLastCalledWith({
          item_type: "folder",
          fuzzy_search: "数学",
          limit: 20,
          offset: 0,
        })
      },
      { timeout: 2000 }
    )
  })

  it("refresh 使缓存失效并重新从首页获取", async () => {
    mockGetWorkspace.mockResolvedValue(
      makeWorkspaceResponse([makeFolderItem("f1", "数学")], 1)
    )

    const { result } = renderHook(() => useFolderList(), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(mockGetWorkspace).toHaveBeenCalledTimes(1)
    })

    mockGetWorkspace.mockClear()

    await act(async () => {
      result.current.refresh()
    })

    await waitFor(() => {
      expect(mockGetWorkspace).toHaveBeenCalledWith({
        item_type: "folder",
        limit: 20,
        offset: 0,
      })
    })
  })

  it("API 错误时 isError 为 true", async () => {
    mockGetWorkspace.mockRejectedValue(new Error("网络错误"))

    const { result } = renderHook(() => useFolderList(), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe("网络错误")
  })
})
