import { renameFolder } from "@/api/eduai/workspace"
import type { WorkspaceFolderInfo } from "@/api/eduai/workspace.types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/utils/cn"
import { format } from "date-fns"
import {
  FolderOpenIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { useCallback } from "react"
import { useNavigate } from "react-router"
import { useInlineRename } from "../hooks/use-inline-rename"

interface FolderCardProps {
  folder: WorkspaceFolderInfo
  selectable?: boolean
  selected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  onDelete?: (id: string) => void
  onRefresh?: () => void
}

export function FolderCard({
  folder,
  selectable = false,
  selected = false,
  onSelect,
  onDelete,
  onRefresh,
}: FolderCardProps) {
  const navigate = useNavigate()

  const handleSave = useCallback(
    async (name: string) => {
      await renameFolder(folder.id, { name })
      onRefresh?.()
    },
    [folder.id, onRefresh]
  )

  const {
    editing,
    editValue,
    isSaving,
    inputRef,
    containerRef,
    startEditing,
    handleKeyDown,
    setEditValue,
  } = useInlineRename({ onSave: handleSave })

  const handleClick = () => {
    if (selectable) {
      onSelect?.(folder.id, !selected)
      return
    }
    const params = new URLSearchParams(location.search)
    params.set("fid", folder.id)
    navigate(`/studio?${params.toString()}`)
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex min-h-36 flex-col overflow-hidden rounded-lg border bg-card p-4 transition-shadow",
        !selectable && "cursor-pointer hover:shadow-md",
        selectable && "cursor-pointer",
        selected && "ring-2 ring-brand"
      )}
      onClick={editing ? undefined : handleClick}
    >
      {/* Big folder icon background — centered right area */}
      <FolderOpenIcon className="pointer-events-none absolute top-12 right-8 size-24 translate-x-1/4 -translate-y-1/2 text-muted-foreground/15" />

      {selectable && (
        <div className="absolute top-3 left-3 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={(value) => onSelect?.(folder.id, !!value)}
            onClick={(e) => e.stopPropagation()}
            aria-label="选择文件夹"
            className="data-checked:border-brand data-checked:bg-brand data-checked:text-brand-foreground"
          />
        </div>
      )}

      {/* Title */}
      <div className={cn("relative", selectable && "pl-7")}>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              disabled={isSaving}
              className="w-full rounded border bg-background px-2 py-1 text-sm font-semibold ring-1 ring-brand outline-none"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
            {isSaving && (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            )}
          </div>
        ) : (
          <h3 className="truncate text-sm font-semibold">{folder.name}</h3>
        )}
      </div>

      {/* Spacer pushes bottom row down */}
      <div className="flex-1" />

      {/* Bottom: time + actions */}
      <div
        className={cn(
          "relative flex items-center justify-between",
          selectable && "pl-7"
        )}
      >
        <span className="text-xs text-muted-foreground">
          {folder.created_at
            ? format(new Date(folder.created_at), "yyyy/MM/dd HH:mm")
            : "—"}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => startEditing(folder.name)}>
              <Pencil className="size-4" />
              重命名文件夹
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete?.(folder.id)}
            >
              <Trash2 className="size-4" />
              删除文件夹
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
