import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadFile } from "@/utils/upload"
import { isUrl } from "./utils"

interface WatermarkRowProps {
  value: string
  onChange: (v: string) => void
}

export function WatermarkRow({ value, onChange }: WatermarkRowProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasValue = value.length > 0
  const isImage = isUrl(value)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file, file.type)
      onChange(url)
    } catch {
      // 上传失败 toast 由 http-hooks 处理
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="flex items-start gap-3">
      <span className="w-10 shrink-0 pt-1.5 text-xs text-muted-foreground">
        水印
      </span>
      <div className="flex flex-1 items-start gap-3">
        <div className="flex-1 space-y-1.5">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="文字或图片 URL"
            className="h-7 text-xs"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="outline"
            size="xs"
            className="h-7 text-xs"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "上传中..." : "上传图片"}
          </Button>
        </div>
        <div className="aspect-video w-48 shrink-0 overflow-hidden rounded-md border bg-muted">
          {hasValue && isImage ? (
            <img
              src={value}
              alt="水印预览"
              className="size-full object-contain"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-center text-xs text-muted-foreground">
              {hasValue ? value : "未设置"}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
