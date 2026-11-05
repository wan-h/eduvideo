import { Download, History } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"

import { useLatestExportRecord } from "../hooks/use-export-history"
import { useVideoExport } from "../hooks/use-video-export"
import { ExportConfirmDialog } from "./export-confirm-dialog"
import { ExportHistoryDialog } from "./export-history-dialog"

interface ExportButtonsProps {
  scriptId: string
  templateName: string
}

export function ExportButtons({ scriptId, templateName }: ExportButtonsProps) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { exportVideo } = useVideoExport()
  const { latestRecord, refresh } = useLatestExportRecord(scriptId)

  const isActive =
    latestRecord?.status === "pending" || latestRecord?.status === "processing"

  const handleExportClick = () => {
    setConfirmOpen(true)
  }

  const handleConfirmExport = async () => {
    await exportVideo({ script_id: scriptId })
    refresh()
    setHistoryOpen(true)
  }

  const handleViewHistory = () => {
    setHistoryOpen(true)
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 min-w-0">
      {isActive && latestRecord && (
        <span className="text-xs text-muted-foreground shrink-0">
          导出中 {latestRecord.progress}%
        </span>
      )}
      <Button
        variant="ghost"
        className="gap-1.5 px-2 sm:px-3"
        onClick={() => setHistoryOpen(true)}
      >
        <History className="size-4 shrink-0" />
        <span className="hidden sm:inline">导出记录</span>
      </Button>

      <ExportHistoryDialog
        scriptId={scriptId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />

      <ExportConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        templateName={templateName}
        hasActiveExport={isActive}
        onConfirm={handleConfirmExport}
        onViewHistory={handleViewHistory}
      />

      <Button
        variant="ghost"
        className="gap-1.5 px-2 sm:px-3"
        onClick={handleExportClick}
      >
        <Download className="size-4 shrink-0" />
        <span className="hidden sm:inline">导出视频</span>
      </Button>
    </div>
  )
}
