import { Button } from "@/components/ui/button"

interface SaveCancelButtonsProps {
  isSaving: boolean
  pendingAudioCount: number
  onSave: () => Promise<void> | void
  onCancel: () => void
}

export function SaveCancelButtons({
  isSaving,
  pendingAudioCount,
  onSave,
  onCancel,
}: SaveCancelButtonsProps) {
  const blocked = isSaving || pendingAudioCount > 0
  const label = isSaving
    ? "保存中..."
    : pendingAudioCount > 0
      ? "音频生成中..."
      : "保存"

  return (
    <>
      <Button variant="outline" onClick={onCancel} disabled={isSaving}>
        取消
      </Button>
      <Button
        variant="brand"
        className="min-w-[120px]"
        onClick={onSave}
        disabled={blocked}
      >
        {label}
      </Button>
    </>
  )
}
