import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2Icon, PencilIcon, RefreshCwIcon, TrashIcon } from "lucide-react"

import { cn } from "@/utils/cn"

/** 容器样式变体 */
const containerVariants = cva(
  "absolute right-2 bottom-2 flex items-center gap-0.5 rounded-md border bg-background/90 p-0.5 shadow-sm backdrop-blur-sm",
  {
    variants: {
      visibility: {
        visible: "",
        hidden: "opacity-0 transition-opacity group-hover:opacity-100",
      },
    },
    defaultVariants: {
      visibility: "visible",
    },
  }
)

/** 操作按钮样式 */
const actionButtonClass =
  "size-6 rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"

interface CardActionButtonsProps extends VariantProps<
  typeof containerVariants
> {
  /** 编辑回调 */
  onEdit: () => void
  /** 删除回调 */
  onDelete: () => void
  /** 重新生成回调，参数为字幕内容 */
  onRegenerate?: (text: string) => void
  /** 重新生成所需字幕内容 */
  regenerateText?: string
  /** 选中时触发的回调（未选中状态下点击按钮时先触发） */
  onSelect?: () => void
  /** 是否显示删除按钮，默认 true */
  showDelete?: boolean
  /** 是否显示重新生成按钮，默认 false */
  showRegenerate?: boolean
  /** 是否正在重新生成 */
  isRegenerating?: boolean
}

/**
 * 卡片操作按钮组
 *
 * 位置：卡片右下角悬浮
 * 选中状态：常驻显示
 * 未选中状态：悬停时淡入显示，点击按钮会先选中再执行操作
 * Hover 展示操作名称
 * 轮询时：编辑和删除按钮隐藏，仅显示重新生成 loading
 */
export function CardActionButtons({
  visibility,
  onEdit,
  onDelete,
  onRegenerate,
  regenerateText = "",
  onSelect,
  showDelete = true,
  showRegenerate = false,
  isRegenerating = false,
}: CardActionButtonsProps) {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect?.()
    onEdit()
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect?.()
    onDelete()
  }

  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isRegenerating) return
    onSelect?.()
    onRegenerate?.(regenerateText)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn(containerVariants({ visibility }))}>
        {!isRegenerating && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className={actionButtonClass}
                aria-label="编辑"
                onClick={handleEdit}
              >
                <PencilIcon className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">编辑</TooltipContent>
          </Tooltip>
        )}

        {showRegenerate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className={cn(
                  actionButtonClass,
                  isRegenerating && "cursor-not-allowed opacity-50"
                )}
                aria-label={isRegenerating ? "生成中" : "重新生成"}
                onClick={handleRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2Icon className="size-3 animate-spin" />
                ) : (
                  <RefreshCwIcon className="size-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isRegenerating ? "生成中" : "重新生成"}
            </TooltipContent>
          </Tooltip>
        )}

        {showDelete && !isRegenerating && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className={cn(actionButtonClass, "hover:text-destructive")}
                aria-label="删除"
                onClick={handleDelete}
              >
                <TrashIcon className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">删除</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
