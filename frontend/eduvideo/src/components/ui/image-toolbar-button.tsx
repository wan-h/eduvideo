"use client"

import { ImageIcon, Loader2 } from "lucide-react"
import { KEYS } from "platejs"
import { useEditorRef } from "platejs/react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { ToolbarButton } from "@/components/ui/toolbar"
import { uploadFile } from "@/utils/upload"

export function ImageToolbarButton() {
  const editor = useEditorRef()
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      toast.error("仅支持图片文件")
      return
    }

    setUploading(true)
    try {
      const url = await uploadFile(file, file.type)
      editor.tf.insertNodes([
        {
          type: KEYS.img,
          url,
          children: [{ text: "" }],
        },
        {
          type: KEYS.p,
          children: [{ text: "" }],
        },
      ])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "图片上传失败，请重试"
      toast.error(message)
    } finally {
      setUploading(false)
      // 清空 input，允许重复选择同一文件
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        aria-label="选择图片"
      />
      <ToolbarButton
        tooltip="插入图片"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImageIcon className="size-4" />
        )}
      </ToolbarButton>
    </>
  )
}
