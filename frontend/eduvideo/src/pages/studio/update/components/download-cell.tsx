import { Copy, Download, Loader2 } from "lucide-react"
import { useCallback, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

async function triggerBrowserDownload(url: string) {
  const res = await fetch(url)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = blobUrl
  a.download = ""
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "")
  textarea.style.position = "absolute"
  textarea.style.left = "-9999px"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  textarea.remove()
}

interface DownloadCellProps {
  videoUrl: string
}

export function DownloadCell({ videoUrl }: DownloadCellProps) {
  const [activeAction, setActiveAction] = useState<"download" | "copy" | null>(
    null
  )

  const handleDownload = useCallback(async () => {
    if (activeAction || !videoUrl) return
    setActiveAction("download")
    try {
      await triggerBrowserDownload(videoUrl)
    } finally {
      setActiveAction(null)
    }
  }, [activeAction, videoUrl])

  const handleCopy = useCallback(async () => {
    if (activeAction || !videoUrl) return
    setActiveAction("copy")
    try {
      await copyText(videoUrl)
      toast.success("视频链接已复制")
    } catch {
      toast.error("复制失败，请稍后重试")
    } finally {
      setActiveAction(null)
    }
  }, [activeAction, videoUrl])

  if (!videoUrl) return null

  return (
    <div className="flex items-center justify-end gap-3">
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0"
        onClick={handleCopy}
        disabled={activeAction !== null}
      >
        {activeAction === "copy" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Copy className="size-3" />
        )}
        复制链接
      </Button>
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0"
        onClick={handleDownload}
        disabled={activeAction !== null}
      >
        {activeAction === "download" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Download className="size-3" />
        )}
        下载
      </Button>
    </div>
  )
}
