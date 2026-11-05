import { Info, Upload } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/utils/cn"
import { uploadFile } from "@/utils/upload"

import { useRenderSettingsStore } from "@/store/render-settings-store"

function isUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

interface WatermarkPopoverProps {
  dirty?: boolean
}

export function WatermarkPopover({ dirty }: WatermarkPopoverProps = {}) {
  const watermark = useRenderSettingsStore((s) => s.watermark)
  const setWatermark = useRenderSettingsStore((s) => s.setWatermark)
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasWatermark = watermark.length > 0
  const isImage = isUrl(watermark)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file, file.type)
      setWatermark(url)
    } catch {
      // 上传失败，sonner 已在 http-hooks 中处理 toast
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex items-center gap-0 rounded-md p-2 hover:bg-muted-foreground/20",
            hasWatermark && "text-brand",
            dirty && "rounded-md ring-1 ring-yellow-400/60"
          )}
          aria-label="水印设置"
        >
          <Info className="size-5 shrink-0" />
          <span className="max-w-0 overflow-hidden text-sm font-medium whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100">
            {hasWatermark ? (isImage ? "图片水印" : watermark) : "水印"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" side="top" align="end">
        <div className="space-y-3">
          <h4 className="text-sm font-medium">水印设置</h4>

          {/* 图片水印 */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              图片水印（右上角）
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={isImage ? watermark : ""}
                onChange={(e) => setWatermark(e.target.value)}
                placeholder="粘贴图片 URL"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload
                  className={cn("size-4", uploading && "animate-pulse")}
                />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 border-t" />
            <span className="text-xs text-muted-foreground">或</span>
            <div className="flex-1 border-t" />
          </div>

          {/* 文字水印 */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              文字水印（不超过 10 字）
            </label>
            <Input
              value={isImage ? "" : watermark}
              onChange={(e) => setWatermark(e.target.value)}
              placeholder="输入水印文字"
              maxLength={10}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
