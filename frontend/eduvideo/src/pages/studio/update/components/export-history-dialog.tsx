import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/utils/cn"

import { TablePagination } from "@/components/table-pagination"
import type { ExportRecordStatus } from "../hooks/use-export-history"
import { useExportHistory } from "../hooks/use-export-history"
import { DownloadCell } from "./download-cell"
import { ExportHistorySkeleton } from "./export-history-skeleton"

interface ExportHistoryDialogProps {
  scriptId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function StatusBadge({
  status,
  message,
}: {
  status: ExportRecordStatus
  message?: string
}) {
  const styles: Record<ExportRecordStatus, string> = {
    pending: "text-gray-600 bg-gray-50",
    processing: "text-amber-600 bg-amber-50",
    completed: "text-green-600 bg-green-50",
    failed: "text-red-600 bg-red-50",
  }
  const labels: Record<ExportRecordStatus, string> = {
    pending: "等待中",
    processing: "处理中",
    completed: "已完成",
    failed: "失败",
  }

  const badge = (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )

  if (status === "failed" && message) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs break-words">
          {message}
        </TooltipContent>
      </Tooltip>
    )
  }

  return badge
}

export function ExportHistoryDialog({
  scriptId,
  open,
  onOpenChange,
}: ExportHistoryDialogProps) {
  const {
    records,
    error,
    pageIndex,
    setPageIndex,
    pageSize,
    total,
    isInitialLoading,
    isRefetching,
    refresh,
  } = useExportHistory(scriptId, open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>合成历史</DialogTitle>
          <DialogDescription>查看该任务的视频合成记录</DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          {isInitialLoading ? (
            <ExportHistorySkeleton />
          ) : error ? (
            <p className="text-sm text-destructive">加载失败,请稍后重试</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无导出记录</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead className="w-[140px]">时间</TableHead>
                    <TableHead className="w-[60px]">进度</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="w-[180px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {record.id}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {record.createdAt}
                      </TableCell>
                      <TableCell className="text-sm">
                        {Math.round(record.progress)}%
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={record.status}
                          message={record.message}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {record.status === "completed" && (
                          <DownloadCell videoUrl={record.videoUrl} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                variant="detailed"
                pageIndex={pageIndex}
                pageSize={pageSize}
                total={total}
                onPageChange={setPageIndex}
              />
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={refresh}>
            <RefreshCw
              className={cn("mr-1 size-4", isRefetching && "animate-spin")}
            />
            刷新
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
