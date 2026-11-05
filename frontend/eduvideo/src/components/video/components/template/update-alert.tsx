import { Save } from "lucide-react"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface UpdateAlertProps {
  templateName: string
  updateError: string
  onUpdate: () => void
  onDiscard: () => void
}

export function UpdateAlert({
  templateName,
  updateError,
  onUpdate,
  onDiscard,
}: UpdateAlertProps) {
  return (
    <Alert className="mb-3 animate-[alert-flash_0.6s_ease-out] border border-blue-200 bg-blue-50 dark:border-blue-700/50 dark:bg-blue-950/40">
      <div className="flex items-center justify-between gap-4">
        <AlertTitle className="flex-1">
          已修改模板「{templateName}」的配置
        </AlertTitle>
        <div className="flex shrink-0 items-center gap-2">
          {updateError && (
            <p className="text-xs text-destructive">{updateError}</p>
          )}
          <Button size="sm" onClick={onUpdate}>
            <Save className="size-3.5" />
            更新模板
          </Button>
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            放弃修改
          </Button>
        </div>
      </div>
    </Alert>
  )
}
