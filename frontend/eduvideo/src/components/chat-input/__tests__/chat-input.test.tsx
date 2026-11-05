/** @vitest-environment happy-dom */

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ChatInput } from "../chat-input"

vi.mock("@/hooks/use-session-storage", async () => {
  const { useState } = await vi.importActual<typeof import("react")>("react")
  return {
    useSessionStorage: (_key: string, initialValue: string) =>
      useState(initialValue),
  }
})

function makeFile(name: string, type: string): File {
  return new File(["content"], name, { type })
}

/** container.firstElementChild 返回 Element，需断言为 HTMLElement */
function rootEl(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement
}

function fireDropEvent(element: HTMLElement, files: File[]) {
  const dataTransfer: Partial<DataTransfer> = {
    types: files.length > 0 ? ["Files"] : [],
    files: {
      length: files.length,
      item: (i: number) => files[i] ?? null,
      ...files.reduce((acc, f, i) => ({ ...acc, [i]: f }), {}),
    } as unknown as FileList,
    items: {
      add: () => {},
    } as unknown as DataTransferItemList,
    getData: () => "",
  }
  const event = new Event("drop", {
    bubbles: true,
    cancelable: true,
  }) as DragEvent
  Object.defineProperty(event, "dataTransfer", {
    value: dataTransfer,
    writable: false,
  })
  fireEvent(element, event)
}

function fireDragEnterLeave(
  element: HTMLElement,
  type: "dragenter" | "dragleave"
) {
  const dataTransfer: Partial<DataTransfer> = {
    types: ["Files"],
    items: { add: () => {} } as unknown as DataTransferItemList,
  }
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as DragEvent
  Object.defineProperty(event, "dataTransfer", {
    value: dataTransfer,
    writable: false,
  })
  fireEvent(element, event)
}

describe("ChatInput", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染 textarea", () => {
    render(<ChatInput placeholder="输入内容..." />)
    expect(screen.getByPlaceholderText("输入内容...")).toBeTruthy()
  })

  it("dragOverlay 传入时渲染", () => {
    render(
      <ChatInput dragOverlay={<div data-testid="overlay">拖到此处上传</div>} />
    )
    expect(screen.getByTestId("overlay")).toBeTruthy()
  })

  it("dragOverlay 不传时不渲染 overlay", () => {
    render(<ChatInput />)
    expect(screen.queryByText("拖到此处上传")).toBeNull()
  })

  it("拖放文件时调用 onDropFiles", () => {
    const onDropFiles = vi.fn()
    const { container } = render(<ChatInput onDropFiles={onDropFiles} />)
    const file = makeFile("photo.png", "image/png")
    fireDropEvent(rootEl(container), [file])
    expect(onDropFiles).toHaveBeenCalledTimes(1)
    expect(onDropFiles).toHaveBeenCalledWith([file])
  })

  it("拖放空文件列表时不调用 onDropFiles", () => {
    const onDropFiles = vi.fn()
    const { container } = render(<ChatInput onDropFiles={onDropFiles} />)
    fireDropEvent(rootEl(container), [])
    expect(onDropFiles).not.toHaveBeenCalled()
  })

  it("未传 onDropFiles 时拖放不报错", () => {
    const { container } = render(<ChatInput />)
    expect(() => {
      fireDropEvent(rootEl(container), [makeFile("photo.png", "image/png")])
    }).not.toThrow()
  })

  it("dragenter 时调用 onFileDragActiveChange(true)", () => {
    const onChange = vi.fn()
    const { container } = render(
      <ChatInput onFileDragActiveChange={onChange} />
    )
    fireDragEnterLeave(rootEl(container), "dragenter")
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("dragleave 时调用 onFileDragActiveChange(false)", () => {
    const onChange = vi.fn()
    const { container } = render(
      <ChatInput onFileDragActiveChange={onChange} />
    )
    fireDragEnterLeave(rootEl(container), "dragenter")
    fireDragEnterLeave(rootEl(container), "dragleave")
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it("drop 后重置 onFileDragActiveChange 为 false", () => {
    const onChange = vi.fn()
    const { container } = render(
      <ChatInput onDropFiles={vi.fn()} onFileDragActiveChange={onChange} />
    )
    fireDragEnterLeave(rootEl(container), "dragenter")
    expect(onChange).toHaveBeenCalledWith(true)
    fireDropEvent(rootEl(container), [makeFile("photo.png", "image/png")])
    expect(onChange).toHaveBeenCalledWith(false)
  })
})
