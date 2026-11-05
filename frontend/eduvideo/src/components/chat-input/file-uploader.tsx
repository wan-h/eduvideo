import { File, Loader2, Paperclip, Upload, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useHomeDisplayInfo } from "@/hooks/use-home-display-info"
import { cn } from "@/utils/cn"

// ── 文件预览项 ──────────────────────────────

interface FilePreviewItem {
  file: File
  url: string | null
  uploading: boolean
}

// ── 文件预览列表 ────────────────────────────

export function FilePreviewList({
  items,
  onRemove,
}: {
  items: FilePreviewItem[]
  onRemove: (index: number) => void
}) {
  const blobUrls = useMemo(
    () => items.map((item) => URL.createObjectURL(item.file)),
    [items]
  )
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    return () => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [blobUrls])

  if (items.length === 0) return null

  const activeItem = activeIndex !== null ? items[activeIndex] : null
  const activeSrc =
    activeItem?.url ?? (activeIndex !== null ? blobUrls[activeIndex] : null)
  const isActiveImage =
    activeItem !== null && activeItem.file.type.startsWith("image/")

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => {
          const isImage = item.file.type.startsWith("image/")
          const src = item.url ?? blobUrls[index]

          return (
            <div
              key={`${item.file.name}-${index}`}
              className="group relative size-16 overflow-hidden rounded-lg border"
            >
              {isImage ? (
                <button
                  type="button"
                  className="size-full cursor-zoom-in"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`查看大图：${item.file.name}`}
                >
                  <img
                    src={src}
                    alt={item.file.name}
                    className="size-full object-cover transition-transform duration-200 group-hover:scale-110"
                  />
                </button>
              ) : (
                <a
                  href={item.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex size-full flex-col items-center justify-center gap-0.5 bg-muted/50 text-muted-foreground",
                    item.url &&
                      "cursor-pointer hover:bg-muted hover:text-foreground"
                  )}
                  aria-label={`打开文件：${item.file.name}`}
                  onClick={(e) => {
                    if (!item.url) e.preventDefault()
                  }}
                >
                  <File className="size-5" />
                  <span className="truncate px-1 text-[9px] leading-tight">
                    {item.file.name}
                  </span>
                </a>
              )}
              {item.uploading && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="size-4 animate-spin text-white" />
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-1 right-1 flex size-5 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          )
        })}
      </div>

      {/* 图片大图预览 */}
      <Dialog
        open={activeIndex !== null}
        onOpenChange={(open) => {
          if (!open) setActiveIndex(null)
        }}
      >
        <DialogContent
          className="max-w-[90vw] border-0 bg-transparent p-0 shadow-none"
          showCloseButton={false}
        >
          {activeSrc && activeItem && isActiveImage ? (
            <div className="relative mx-auto w-fit">
              <DialogClose asChild>
                <button
                  type="button"
                  className="absolute top-2 right-2 z-10 flex size-9 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/75"
                  aria-label="关闭大图"
                >
                  <X className="size-4" />
                </button>
              </DialogClose>
              <img
                src={activeSrc}
                alt={activeItem.file.name}
                className="max-h-[85vh] w-auto max-w-[90vw] rounded-lg object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── 文件上传按钮 ────────────────────────────

export function FileUploader({
  value,
  onAdd,
}: {
  value: File[]
  onAdd: (files: File[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const triggerFileSelect = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length > 0) {
        onAdd(files)
        setOpen(false)
      }
      e.target.value = ""
    },
    [onAdd]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        onAdd(files)
        setOpen(false)
      }
    },
    [onAdd]
  )

  const { data: displayInfo } = useHomeDisplayInfo()
  const fileTips = displayInfo?.file_tips
  const hasFiles = value.length > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 rounded-full border-transparent text-xs font-medium dark:border-transparent",
            hasFiles && "text-brand hover:text-brand"
          )}
        >
          <Paperclip className="size-3.5 shrink-0" />
          <span>上传文件</span>
          {hasFiles && (
            <span className="text-[10px] font-medium">{value.length}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" side="bottom" align="center">
        {fileTips && fileTips.length > 0 && (
          <div className="mb-3 rounded-md bg-muted/50 px-3 py-2">
            <ul className="space-y-1">
              {fileTips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-xs text-muted-foreground"
                >
                  <span className="mt-[3px] size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div
          className={cn(
            "flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-4 py-6 transition-colors",
            isDragOver
              ? "border-brand bg-brand/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
          )}
          onClick={triggerFileSelect}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDragOver(false)
          }}
          onDrop={handleDrop}
        >
          <Upload className="size-6 text-muted-foreground" />
          <p className="text-center text-xs text-muted-foreground">
            点击选择文件，支持图片、PDF 及 Word/DOC 文档
          </p>
        </div>
      </PopoverContent>
      <input
        ref={inputRef}
        accept="image/*,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        multiple
        type="file"
        onChange={handleFileChange}
      />
    </Popover>
  )
}
