import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { usePageDragDetector } from "../use-page-drag-detector"

/**
 * jsdom 未内置 DataTransfer/DragEvent，提供最小 mock。
 */
function fireDragEvent(
  type: "dragenter" | "dragleave" | "drop" | "dragover",
  hasFiles: boolean
) {
  const types: string[] = hasFiles ? ["Files"] : []
  const dataTransfer: Partial<DataTransfer> = {
    types,
    items: {
      add: () => {},
    } as unknown as DataTransferItemList,
  }
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as DragEvent
  Object.defineProperty(event, "dataTransfer", {
    value: dataTransfer,
    writable: false,
  })
  document.dispatchEvent(event)
}

describe("usePageDragDetector", () => {
  it("初始状态 isDragActive 为 false", () => {
    const { result } = renderHook(() => usePageDragDetector())
    expect(result.current).toBe(false)
  })

  it("文件拖入页面时 isDragActive 变为 true", () => {
    const { result } = renderHook(() => usePageDragDetector())
    act(() => {
      fireDragEvent("dragenter", true)
    })
    expect(result.current).toBe(true)
  })

  it("文件离开页面时 isDragActive 变为 false", () => {
    const { result } = renderHook(() => usePageDragDetector())
    act(() => {
      fireDragEvent("dragenter", true)
    })
    expect(result.current).toBe(true)
    act(() => {
      fireDragEvent("dragleave", false)
    })
    expect(result.current).toBe(false)
  })

  it("非文件拖拽不激活", () => {
    const { result } = renderHook(() => usePageDragDetector())
    act(() => {
      fireDragEvent("dragenter", false)
    })
    expect(result.current).toBe(false)
  })

  it("卸载时清理监听器", () => {
    const { result, unmount } = renderHook(() => usePageDragDetector())
    act(() => {
      fireDragEvent("dragenter", true)
    })
    expect(result.current).toBe(true)
    unmount()
    act(() => {
      fireDragEvent("dragleave", false)
    })
    // 卸载不应抛出
  })

  it("drop 事件重置 isDragActive", () => {
    const { result } = renderHook(() => usePageDragDetector())
    act(() => {
      fireDragEvent("dragenter", true)
    })
    expect(result.current).toBe(true)
    act(() => {
      fireDragEvent("drop", true)
    })
    expect(result.current).toBe(false)
  })

  it("document dragover 调用 preventDefault 阻止浏览器默认行为", () => {
    renderHook(() => usePageDragDetector())
    const event = new Event("dragover", {
      bubbles: true,
      cancelable: true,
    }) as DragEvent
    const preventDefaultSpy = vi.spyOn(event, "preventDefault")
    Object.defineProperty(event, "dataTransfer", {
      value: { types: ["Files"], items: { add: () => {} } },
      writable: false,
    })
    document.dispatchEvent(event)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })
})
