import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ExportConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateName: string
  hasActiveExport: boolean
  onConfirm: () => void
  onViewHistory: () => void
}

export function ExportConfirmDialog({
  open,
  onOpenChange,
  templateName,
  hasActiveExport,
  onConfirm,
  onViewHistory,
}: ExportConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const handleViewHistory = () => {
    onViewHistory()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>确认导出视频</DialogTitle>
          <DialogDescription>
            使用「{templateName}」导出模板渲染生成最终讲解视频。
          </DialogDescription>
        </DialogHeader>

        {hasActiveExport && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              当前有视频正在导出中，可前往历史记录列表查看进度。是否仍要继续导出？
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          {hasActiveExport && (
            <Button variant="outline" onClick={handleViewHistory}>
              查看历史记录
            </Button>
          )}
          <Button variant="brand" onClick={handleConfirm}>
            {hasActiveExport ? "仍要导出" : "确认导出"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
