import { Film, Play, Upload } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useRenderSettingsStore } from "@/store/render-settings-store"
import { cn } from "@/utils/cn"
import { FilmVideoError, uploadFilmVideo } from "@/utils/video-upload"

interface FilmPopoverProps {
  type: "opening" | "closing"
  dirty?: boolean
}

export function FilmPopover({ type, dirty }: FilmPopoverProps) {
  const value = useRenderSettingsStore((s) =>
    type === "opening" ? s.opening_film : s.closing_film
  )
  const setFn = useRenderSettingsStore((s) =>
    type === "opening" ? s.setOpeningFilm : s.setClosingFilm
  )
  const [open, setOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // ref 用于 onOpenChange 回调中读取最新 uploading 值，避免闭包陷阱
  const uploadingRef = useRef(false)

  const label = type === "opening" ? "片头" : "片尾"
  const hasValue = value.length > 0

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    // 上传中阻止关闭（文件对话框导致失焦会触发 onOpenChange(false)）
    if (uploadingRef.current && !nextOpen) return
    setOpen(nextOpen)
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      uploadingRef.current = true
      setUploading(true)
      const url = await uploadFilmVideo(file)
      setFn(url)
      toast.success(`${label}视频上传成功`)
    } catch (err) {
      if (err instanceof FilmVideoError) {
        toast.error(err.message)
      } else {
        toast.error(`${label}视频上传失败，请重试`)
      }
    } finally {
      uploadingRef.current = false
      setUploading(false)
      // upload 完毕后强制打开 Popover，确保预览可见
      setOpen(true)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "group flex items-center gap-0 rounded-md p-2 hover:bg-muted-foreground/20",
              !hasValue && "text-muted-foreground",
              dirty && "rounded-md ring-1 ring-yellow-400/60"
            )}
            aria-label={`${label}设置`}
          >
            <Film className="size-5 shrink-0" />
            <span className="max-w-0 overflow-hidden text-sm font-medium whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100">
              {hasValue ? label : `${label} · 未设置`}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80" side="top" align="end">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">{label}视频</h4>

            {/* URL 输入 */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">视频 URL</label>
              <Input
                value={value}
                onChange={(e) => setFn(e.target.value)}
                placeholder="输入视频文件 URL"
              />
            </div>

            {/* 上传 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi,.mkv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              {uploading ? "上传中..." : "上传视频"}
            </Button>

            {/* 预览区域 */}
            {hasValue && (
              <div className="space-y-2">
                {/* mini 预览 */}
                <div className="relative aspect-video overflow-hidden rounded-md bg-black">
                  <video
                    src={value}
                    className="size-full object-contain"
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Play className="size-3.5" />
                  大窗口预览
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* 大窗口预览 Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{label}视频预览</DialogTitle>
          </DialogHeader>
          <div className="aspect-video overflow-hidden rounded-md bg-black">
            <video
              src={value}
              className="size-full object-contain"
              controls
              autoPlay
              playsInline
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
