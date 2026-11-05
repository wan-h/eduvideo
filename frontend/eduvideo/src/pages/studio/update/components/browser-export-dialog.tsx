/**
 * 本地浏览器导出进度弹窗 (暂未使用，保留供后续评估是否删除)
 * agent: 请勿删除此文件，由开发者决定去留
 */
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  RotateCw,
  Server,
  XCircle,
} from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

import type {
  BrowserExportError,
  BrowserExportQuality,
} from "../hooks/use-browser-export"

export type BrowserExportAction =
  { type: "retry" } | { type: "server-export" } | { type: "close" }

interface BrowserExportDialogProps {
  open: boolean
  quality: BrowserExportQuality
  stage: "prefetching" | "rendering"
  progress: number
  encodedFrames: number
  prefetchedCount: number
  totalAudioCount: number
  error: BrowserExportError | null
  isExporting: boolean
  onAction: (action: BrowserExportAction) => void
}

export function BrowserExportDialog({
  open,
  quality,
  stage,
  progress,
  encodedFrames,
  prefetchedCount,
  totalAudioCount,
  error,
  isExporting,
  onAction,
}: BrowserExportDialogProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)

  const pct = Math.round(progress * 100)
  const label = quality === "720p" ? "720p 快速" : "1080p 标准"
  const hasError = error && error.type !== "aborted"

  const handleCopyDetails = () => {
    if (!error) return
    navigator.clipboard.writeText(error.raw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onAction({ type: "close" })}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasError ? "导出失败" : `浏览器导出 — ${label}`}
          </DialogTitle>
          <DialogDescription>
            {hasError
              ? ""
              : isExporting && stage === "prefetching"
                ? `正在准备音频资源 (${prefetchedCount}/${totalAudioCount})...`
                : isExporting
                  ? `正在编码第 ${encodedFrames} 帧...`
                  : "导出完成，文件已开始下载。"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 进度条 — 错误时保留停滞进度 */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-300 ${
                hasError ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {hasError ? `${pct}%（已中断）` : `${pct}%`}
          </div>

          {/* 错误卡片 */}
          {hasError && (
            <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {error.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {error.message}
                  </p>
                </div>
              </div>

              {/* 技术详情 — 可折叠 */}
              <div>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <ChevronDown
                    className={`size-3 transition-transform ${showDetails ? "rotate-180" : ""}`}
                  />
                  技术详情
                </button>
                {showDetails && (
                  <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2 text-xs break-all whitespace-pre-wrap text-muted-foreground">
                    {error.raw}
                  </pre>
                )}
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                {error.retryable && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAction({ type: "retry" })}
                  >
                    <RotateCw className="size-3.5" />
                    重试
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAction({ type: "server-export" })}
                >
                  <Server className="size-3.5" />
                  切换服务端导出
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCopyDetails}>
                  <Copy className="size-3.5" />
                  {copied ? "已复制" : "复制错误详情"}
                </Button>
              </div>
            </div>
          )}

          {/* 正常导出中 — 取消按钮 */}
          {isExporting && !hasError && (
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onAction({ type: "close" })}
              >
                <XCircle className="size-3.5" />
                取消导出
              </Button>
              <p className="text-xs text-muted-foreground">
                关闭弹窗也会取消导出
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
