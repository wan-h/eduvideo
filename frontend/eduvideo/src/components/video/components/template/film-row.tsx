import { useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadFilmVideo } from "@/utils/video-upload"

interface FilmRowProps {
  label: string
  value: string
  onChange: (v: string) => void
}

export function FilmRow({ label, value, onChange }: FilmRowProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasValue = value.length > 0

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFilmVideo(file)
      onChange(url)
      toast.success(`${label}视频上传成功`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${label}视频上传失败`)
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
        {label}
      </span>
      <div className="flex flex-1 items-start gap-3">
        <div className="flex-1 space-y-1.5">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="视频 URL"
            className="h-7 text-xs"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi,.mkv"
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
            {uploading ? "上传中..." : "上传视频"}
          </Button>
        </div>
        <div className="aspect-video w-48 shrink-0 overflow-hidden rounded-md border bg-muted">
          {hasValue ? (
            <video
              src={value}
              className="size-full object-contain"
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
              未设置
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
