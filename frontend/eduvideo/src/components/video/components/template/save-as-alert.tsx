import { Save } from "lucide-react"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SaveAsAlertProps {
  saveAsName: string
  saveAsError: string
  onSaveAsNameChange: (v: string) => void
  onSaveAsErrorClear: () => void
  onSave: () => void
  onCancel: () => void
}

export function SaveAsAlert({
  saveAsName,
  saveAsError,
  onSaveAsNameChange,
  onSaveAsErrorClear,
  onSave,
  onCancel,
}: SaveAsAlertProps) {
  return (
    <Alert className="mb-3 animate-[alert-flash_0.6s_ease-out] border border-blue-200 bg-blue-50 dark:border-blue-700/50 dark:bg-blue-950/40">
      <div className="flex items-center gap-2">
        <AlertTitle className="shrink-0">新建模板</AlertTitle>
        <Input
          value={saveAsName}
          onChange={(e) => {
            onSaveAsNameChange(e.target.value)
            if (saveAsError) onSaveAsErrorClear()
          }}
          placeholder="输入模板名称"
          className="h-7 flex-1 bg-background text-xs"
          autoFocus
        />
        <Button size="xs" onClick={onSave} disabled={!saveAsName.trim()}>
          <Save className="size-3.5" />
          保存
        </Button>
        <Button variant="ghost" size="xs" onClick={onCancel}>
          取消
        </Button>
      </div>
      {saveAsError && (
        <p className="mt-1 text-xs text-destructive">{saveAsError}</p>
      )}
    </Alert>
  )
}
