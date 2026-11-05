import { useCallback, useState } from "react"
import { toast } from "sonner"

import { validateFiles } from "@/utils/file-validator"
import { uploadFile } from "@/utils/upload"

export interface FileItem {
  file: File
  url: string | null
  uploading: boolean
}

export function useFileUpload() {
  const [items, setItems] = useState<FileItem[]>([])

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return

    const { valid, invalid } = validateFiles(files)

    // 不合法文件 toast 提示
    for (const file of invalid) {
      toast.error(`不支持的文件类型：${file.name}`)
    }

    if (valid.length === 0) return

    const newItems: FileItem[] = valid.map((file) => ({
      file,
      url: null,
      uploading: true,
    }))

    setItems((prev) => [...prev, ...newItems])

    for (const item of newItems) {
      uploadFile(item.file, item.file.type)
        .then((url) => {
          setItems((prev) =>
            prev.map((i) =>
              i.file === item.file ? { ...i, url, uploading: false } : i
            )
          )
        })
        .catch(() => {
          toast.error(`文件 ${item.file.name} 上传失败`)
          setItems((prev) => prev.filter((i) => i.file !== item.file))
        })
    }
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  /** 已上传成功的 URL 列表，用于提交 */
  const uploadedUrls = items
    .filter((i) => i.url !== null)
    .map((i) => i.url as string)

  const files = items.map((i) => i.file)
  const hasUploading = items.some((i) => i.uploading)

  return { items, files, uploadedUrls, hasUploading, addFiles, removeItem }
}
