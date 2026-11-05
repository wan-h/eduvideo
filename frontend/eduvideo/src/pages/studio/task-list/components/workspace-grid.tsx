import type { WorkspaceItem } from "@/api/eduai/workspace.types"
import { cn } from "@/utils/cn"
import { FolderOpen } from "lucide-react"
import { FolderCard } from "./folder-card"
import { TaskCard } from "./task-card"

interface WorkspaceGridProps {
  items: WorkspaceItem[]
  selectionMode: boolean
  selectedIds: Set<string>
  onSelect: (id: string, selected: boolean) => void
  onDelete: (id: string) => void
  onMove: (id: string) => void
  onRefresh: () => void
  isPlaceholderData?: boolean
}

export function WorkspaceGrid({
  items,
  selectionMode,
  selectedIds,
  onSelect,
  onDelete,
  onMove,
  onRefresh,
  isPlaceholderData = false,
}: WorkspaceGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
        <FolderOpen className="mb-2 size-8 opacity-40" />
        暂无内容
      </div>
    )
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 lg:grid-cols-4",
        isPlaceholderData && "opacity-50 transition-opacity"
      )}
    >
      {items.map((item) =>
        item.item_type === "folder" ? (
          <FolderCard
            key={item.id}
            folder={item}
            selectable={selectionMode}
            selected={selectedIds.has(item.id)}
            onSelect={onSelect}
            onDelete={onDelete}
            onRefresh={onRefresh}
          />
        ) : (
          <TaskCard
            key={item.id}
            task={item}
            selectable={selectionMode}
            selected={selectedIds.has(item.id)}
            onSelect={onSelect}
            onDelete={onDelete}
            onMove={onMove}
            onRefresh={onRefresh}
          />
        )
      )}
    </div>
  )
}
