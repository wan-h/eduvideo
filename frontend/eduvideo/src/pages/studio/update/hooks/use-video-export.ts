import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { submitSynthesisTask } from "@/api/eduai/synthesis"
import {
  toVideoExportDesc,
  useRenderSettingsStore,
} from "@/store/render-settings-store"

export function useVideoExport() {
  const [isExporting, setIsExporting] = useState(false)
  const queryClient = useQueryClient()

  const exportVideo = async (req: { script_id: string }) => {
    setIsExporting(true)
    try {
      const settings = useRenderSettingsStore.getState()
      await submitSynthesisTask({
        script_id: req.script_id,
        export_settings: toVideoExportDesc(settings),
      })
      await queryClient.invalidateQueries({
        queryKey: ["synthesis"],
      })
      toast.success("合成任务已提交")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "合成失败，请稍后重试"
      toast.error(message)
      throw err
    } finally {
      setIsExporting(false)
    }
  }

  return { exportVideo, isExporting }
}

