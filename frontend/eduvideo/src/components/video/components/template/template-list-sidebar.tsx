import { Pencil, Plus, Trash2 } from "lucide-react"
import { Fragment } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/utils/cn"

import type { TemplateItemData } from "./hooks"

interface TemplateListSidebarProps {
  items: TemplateItemData[]
  selectedItemId: string | undefined
  hasApiTemplates: boolean
  editingId: string | null
  editName: string
  onNewClick: () => void
  onSelectTemplate: (item: TemplateItemData) => void
  onStartRename: (id: string, name: string) => void
  onCancelRename: () => void
  onSaveRename: (id: string) => void
  onDelete: (id: string, name: string) => void
  onEditNameChange: (v: string) => void
}

export function TemplateListSidebar({
  items,
  selectedItemId,
  hasApiTemplates,
  editingId,
  editName,
  onNewClick,
  onSelectTemplate,
  onStartRename,
  onCancelRename,
  onSaveRename,
  onDelete,
  onEditNameChange,
}: TemplateListSidebarProps) {
  return (
    <div className="flex w-56 shrink-0 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground">模板列表</h4>
        <TooltipProvider delayDuration={400}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="xs" onClick={onNewClick}>
                <Plus className="size-3" />
                新建
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              基于当前配置创建模板
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="relative flex-1">
        <div className="absolute inset-0 space-y-0.5 overflow-y-auto">
          {items.map((item, index) => {
            const isEditing = editingId === item.id
            const highlight = selectedItemId === item.id

            return (
              <Fragment key={item.id}>
                <div
                  className={cn(
                    "group flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors",
                    highlight && "bg-brand/10",
                    !highlight && "hover:bg-accent"
                  )}
                >
                  {isEditing ? (
                    <div className="flex flex-1 items-center gap-1">
                      <Input
                        value={editName}
                        onChange={(e) => onEditNameChange(e.target.value)}
                        className="h-6 flex-1 text-xs"
                        autoFocus
                      />
                      <Button
                        size="xs"
                        onClick={() => onSaveRename(item.id)}
                        disabled={!editName.trim()}
                        className="h-6 px-2 text-xs"
                      >
                        保存
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={onCancelRename}
                        className="h-6 px-2 text-xs"
                      >
                        取消
                      </Button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onSelectTemplate(item)}
                        className="flex-1 truncate text-left text-xs text-foreground"
                      >
                        {item.name}
                      </button>
                      {!item.isDefault && (
                        <div className="flex shrink-0 opacity-0 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                              onStartRename(item.id, item.name)
                            }}
                            aria-label="重命名模板"
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onDelete(item.id, item.name)}
                            aria-label="删除模板"
                          >
                            <Trash2 className="size-3 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {index === 0 && hasApiTemplates && (
                  <Separator className="my-1" />
                )}
              </Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
