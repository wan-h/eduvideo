import { describe, expect, it } from "vitest"
import { validateFiles } from "../file-validator"

function makeFile(name: string, type: string, size = 1024): File {
  return new File(["x".repeat(size)], name, { type })
}

describe("validateFiles", () => {
  it("空数组返回空的 valid 和 invalid", () => {
    const result = validateFiles([])
    expect(result.valid).toEqual([])
    expect(result.invalid).toEqual([])
  })

  it("合法图片文件 (image/*) 归入 valid", () => {
    const files = [
      makeFile("photo.png", "image/png"),
      makeFile("photo.jpg", "image/jpeg"),
      makeFile("photo.gif", "image/gif"),
      makeFile("photo.webp", "image/webp"),
      makeFile("photo.svg", "image/svg+xml"),
    ]
    const result = validateFiles(files)
    expect(result.valid).toEqual(files)
    expect(result.invalid).toEqual([])
  })

  it("合法 PDF 文件归入 valid", () => {
    const files = [makeFile("doc.pdf", "application/pdf")]
    const result = validateFiles(files)
    expect(result.valid).toEqual(files)
    expect(result.invalid).toEqual([])
  })

  it("合法 Word (.doc/.docx) 文件归入 valid", () => {
    const files = [
      makeFile("test.doc", "application/msword"),
      makeFile("test.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      makeFile("test.docx", ""),
    ]
    const result = validateFiles(files)
    expect(result.valid).toEqual(files)
    expect(result.invalid).toEqual([])
  })

  it("不支持的文本文件归入 invalid", () => {
    const files = [makeFile("note.txt", "text/plain")]
    const result = validateFiles(files)
    expect(result.valid).toEqual([])
    expect(result.invalid).toEqual(files)
  })

  it("不支持的可执行文件归入 invalid", () => {
    const files = [makeFile("app.exe", "application/x-msdownload")]
    const result = validateFiles(files)
    expect(result.valid).toEqual([])
    expect(result.invalid).toEqual(files)
  })

  it("不支持的空类型文件归入 invalid", () => {
    const files = [makeFile("unknown", "")]
    const result = validateFiles(files)
    expect(result.valid).toEqual([])
    expect(result.invalid).toEqual(files)
  })

  it("混合文件正确分流 valid 和 invalid", () => {
    const valid = [
      makeFile("photo.png", "image/png"),
      makeFile("doc.pdf", "application/pdf"),
    ]
    const invalid = [
      makeFile("note.txt", "text/plain"),
      makeFile("app.exe", "application/x-msdownload"),
    ]
    const result = validateFiles([...valid, ...invalid])
    expect(result.valid).toEqual(valid)
    expect(result.invalid).toEqual(invalid)
  })

  it("PDF 扩展名无 MIME 时仍按 .pdf 后缀识别", () => {
    const files = [makeFile("doc.PDF", "")]
    const result = validateFiles(files)
    expect(result.valid).toEqual(files)
    expect(result.invalid).toEqual([])
  })

  it("图片扩展名无 MIME 时按 image/* 识别", () => {
    const files = [
      makeFile("pic.PNG", ""),
      makeFile("pic.JPG", ""),
      makeFile("pic.JPEG", ""),
    ]
    const result = validateFiles(files)
    expect(result.valid).toEqual(files)
    expect(result.invalid).toEqual([])
  })
})
