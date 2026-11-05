import { FolderClosedIcon, FolderOpenIcon, XIcon } from "lucide-react"
import { useCallback, useState } from "react"

import type { WorkspaceFolderInfo } from "@/api/eduai/workspace.types"
import {
  FolderSelectDialog,
  type FolderSelectDialogProps,
} from "@/components/folder-select-dialog/folder-select-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"

interface FolderSelectButtonProps {
  value: WorkspaceFolderInfo | null
  onChange: (folder: WorkspaceFolderInfo | null) => void
}

export function FolderSelectButton({
  value,
  onChange,
}: FolderSelectButtonProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = useCallback<FolderSelectDialogProps["onSelect"]>(
    (folder) => {
      onChange(folder)
      setOpen(false)
    },
    [onChange]
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(null)
    },
    [onChange]
  )

  const selected = value !== null

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "h-8 gap-1.5 rounded-full border-transparent text-xs font-medium dark:border-transparent",
          selected && "text-brand hover:text-brand"
        )}
        onClick={() => setOpen(true)}
      >
        {selected ? (
          <FolderOpenIcon className="size-3.5" />
        ) : (
          <FolderClosedIcon className="size-3.5" />
        )}
        <span className="max-w-[100px] truncate">
          {selected ? value.name : "选择保存位置"}
        </span>
        {selected && (
          <span
            role="button"
            tabIndex={0}
            className="ml-0.5 flex size-3.5 items-center justify-center rounded-full text-muted-foreground hover:bg-border/50 hover:text-foreground"
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                handleClear(e as unknown as React.MouseEvent)
            }}
          >
            <XIcon className="size-2.5" />
          </span>
        )}
      </Button>
      <FolderSelectDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={handleSelect}
      />
    </>
  )
}
