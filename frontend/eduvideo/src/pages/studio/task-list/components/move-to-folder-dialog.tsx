import { moveItem } from "@/api/eduai/workspace"
import type { WorkspaceFolderInfo } from "@/api/eduai/workspace.types"
import { FolderSelectDialog } from "@/components/folder-select-dialog/folder-select-dialog"
import { useCallback } from "react"
import { toast } from "sonner"

interface MoveToFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scriptIds: string[]
  currentFolderId: string | null
  onMoved: () => void
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  scriptIds,
  currentFolderId,
  onMoved,
}: MoveToFolderDialogProps) {
  const count = scriptIds.length

  const handleSelect = useCallback(
    async (folder: WorkspaceFolderInfo | null) => {
      if (count === 0) return
      // folder 为 null 表示选择根目录
      const isRoot = folder === null
      try {
        await moveItem({
          items: scriptIds.map((id) => ({
            item_type: "script" as const,
            item_id: id,
          })),
          target_folder_id: isRoot ? "" : folder.id,
        })
        toast.success(
          isRoot
            ? count === 1
              ? "已移动到根目录"
              : `已将 ${count} 个脚本移动到根目录`
            : count === 1
              ? "已移动到文件夹"
              : `已将 ${count} 个脚本移动到文件夹`
        )
        onMoved()
        onOpenChange(false)
      } catch {
        // 错误由 error-toast-hook 自动处理
      }
    },
    [scriptIds, count, onMoved, onOpenChange]
  )

  return (
    <FolderSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      onSelect={handleSelect}
      excludeFolderId={currentFolderId}
      showRootOption
    />
  )
}
