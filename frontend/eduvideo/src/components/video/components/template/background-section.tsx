import type { BackgroundType } from "@ask2vid/shared"
import { BACKGROUND_IMAGE_MAP, BACKGROUNDS } from "@ask2vid/shared"
import { CheckIcon } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/utils/cn"
import { uploadFile } from "@/utils/upload"

interface BackgroundSectionProps {
  current: BackgroundType | string
  onSelect: (v: BackgroundType | string) => void
}

export function BackgroundSection({
  current,
  onSelect,
}: BackgroundSectionProps) {
  const [customUrl, setCustomUrl] = useState(() =>
    current in BACKGROUND_IMAGE_MAP ? "" : current
  )
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isCustom = !(current in BACKGROUND_IMAGE_MAP)
  const hasCustom = customUrl.length > 0

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file, file.type)
      onSelect(url)
      setCustomUrl(url)
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
    <div>
      <span className="mb-1.5 block text-xs text-muted-foreground">背景</span>
      <h5 className="mb-1.5 text-xs text-muted-foreground">预设背景</h5>
      <div className="grid grid-cols-3 gap-2">
        {BACKGROUNDS.map((bg) => (
          <button
            key={bg.value}
            type="button"
            onClick={() => onSelect(bg.value)}
            className={cn(
              "group relative aspect-video overflow-hidden rounded-lg border-2 transition-colors",
              current === bg.value
                ? "border-brand ring-2 ring-brand/30"
                : "border-border hover:border-muted-foreground/40"
            )}
          >
            <img
              src={`/${BACKGROUND_IMAGE_MAP[bg.value]}`}
              alt={bg.label}
              className="size-full object-cover"
            />
            {current === bg.value && (
              <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-white">
                <CheckIcon className="size-3.5" />
              </span>
            )}
          </button>
        ))}
      </div>

      <Separator className="my-2.5" />

      <h5 className="mb-1.5 text-xs text-muted-foreground">自定义背景</h5>
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1.5">
          <Input
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="或粘贴自定义背景 URL"
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && customUrl.trim()) {
                onSelect(customUrl.trim())
              }
            }}
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
        <button
          type="button"
          onClick={() => {
            if (customUrl) onSelect(customUrl)
          }}
          className={cn(
            "relative aspect-video w-48 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-colors",
            isCustom
              ? "border-brand ring-2 ring-brand/30"
              : "border-border hover:border-muted-foreground/40"
          )}
        >
          {hasCustom ? (
            <img
              src={customUrl}
              alt="自定义背景"
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
              自定义
            </span>
          )}
          {isCustom && (
            <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-white">
              <CheckIcon className="size-3.5" />
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
