/** @vitest-environment happy-dom */

import type { ValidateFilesResult } from "@/utils/file-validator"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useFileUpload } from "../use-file-upload"

let mockValidateResult: ValidateFilesResult = { valid: [], invalid: [] }
const mockValidateFiles = vi.fn((_files: File[]) => mockValidateResult)
const mockUploadFile = vi.fn()
const mockToastError = vi.fn()

vi.mock("@/utils/file-validator", () => ({
  validateFiles: (files: File[]) => mockValidateFiles(files),
}))

vi.mock("@/utils/upload", () => ({
  uploadFile: (...args: unknown[]) => mockUploadFile(...args),
}))

vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}))

function makeFile(name: string, type: string, size = 1024): File {
  return new File(["x".repeat(size)], name, { type })
}

describe("useFileUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateResult = { valid: [], invalid: [] }
  })

  it("初始 items 为空", () => {
    const { result } = renderHook(() => useFileUpload())
    expect(result.current.items).toEqual([])
  })

  it("addFiles 仅添加 valid 文件并开始上传", () => {
    const validFile = makeFile("photo.png", "image/png")
    mockValidateResult = { valid: [validFile], invalid: [] }
    mockUploadFile.mockResolvedValue("https://oss/photo.png")

    const { result } = renderHook(() => useFileUpload())
    act(() => {
      result.current.addFiles([validFile])
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].file).toBe(validFile)
    expect(result.current.items[0].uploading).toBe(true)
  })

  it("addFiles 过滤不合法文件并 toast", () => {
    const validFile = makeFile("photo.png", "image/png")
    const invalidFile = makeFile("virus.exe", "application/x-msdownload")
    mockValidateResult = { valid: [validFile], invalid: [invalidFile] }
    mockUploadFile.mockResolvedValue("https://oss/photo.png")

    const { result } = renderHook(() => useFileUpload())
    act(() => {
      result.current.addFiles([validFile, invalidFile])
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].file).toBe(validFile)
    expect(mockToastError).toHaveBeenCalledTimes(1)
  })

  it("全部文件不合法时 items 保持空，每个不合法文件一条 toast", () => {
    const invalidFiles = [
      makeFile("a.exe", "application/x-msdownload"),
      makeFile("b.txt", "text/plain"),
    ]
    mockValidateResult = { valid: [], invalid: invalidFiles }

    const { result } = renderHook(() => useFileUpload())
    act(() => {
      result.current.addFiles(invalidFiles)
    })

    expect(result.current.items).toEqual([])
    expect(mockToastError).toHaveBeenCalledTimes(2)
  })

  it("空数组调用不触发任何操作", () => {
    const { result } = renderHook(() => useFileUpload())
    act(() => {
      result.current.addFiles([])
    })

    expect(result.current.items).toEqual([])
    expect(mockValidateFiles).not.toHaveBeenCalled()
  })

  it("uploadedUrls 仅返回上传成功的 URL", async () => {
    const file = makeFile("doc.pdf", "application/pdf")
    const url = "https://oss/doc.pdf"
    mockValidateResult = { valid: [file], invalid: [] }
    mockUploadFile.mockResolvedValue(url)

    const { result } = renderHook(() => useFileUpload())
    act(() => {
      result.current.addFiles([file])
    })

    await vi.waitFor(() => {
      expect(result.current.uploadedUrls).toEqual([url])
    })
  })

  it("removeItem 按索引移除文件", () => {
    const file = makeFile("photo.png", "image/png")
    mockValidateResult = { valid: [file], invalid: [] }
    mockUploadFile.mockResolvedValue("https://oss/photo.png")

    const { result } = renderHook(() => useFileUpload())
    act(() => {
      result.current.addFiles([file])
    })
    expect(result.current.items).toHaveLength(1)

    act(() => {
      result.current.removeItem(0)
    })
    expect(result.current.items).toEqual([])
  })
})
