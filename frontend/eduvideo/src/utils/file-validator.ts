const ALLOWED_IMAGE_TYPES = ["image/"]
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]
const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
]

export interface ValidateFilesResult {
  valid: File[]
  invalid: File[]
}

function isImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.some((prefix) => mimeType.startsWith(prefix))
}

function isAllowedExtension(fileName: string): boolean {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."))
  return ALLOWED_EXTENSIONS.includes(ext)
}

function isAllowedFile(file: File): boolean {
  if (isImageType(file.type)) return true
  if (ALLOWED_DOC_TYPES.includes(file.type)) return true
  if (isAllowedExtension(file.name)) return true
  return false
}

/**
 * 校验文件类型，分流合法/不合法文件。
 * 合法类型：image/* 和 .pdf。
 * MIME 不可用时以文件扩展名兜底。
 */
export function validateFiles(files: File[]): ValidateFilesResult {
  return files.reduce<ValidateFilesResult>(
    (acc, file) => {
      if (isAllowedFile(file)) {
        acc.valid.push(file)
      } else {
        acc.invalid.push(file)
      }
      return acc
    },
    { valid: [], invalid: [] }
  )
}
