import type { QuestionExtractConfirmInfo } from "@/api/eduai/question-extract.types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/utils/cn"
import { format } from "date-fns"
import { MoreHorizontal, SquareCheckBig, Trash2 } from "lucide-react"
import { countQuestionTypes } from "../mock/pending-confirm"

interface PendingConfirmCardProps {
  item: QuestionExtractConfirmInfo
  onConfirm?: (id: string) => void
  onDelete?: (id: string) => void
}

export function PendingConfirmCard({
  item,
  onConfirm,
  onDelete,
}: PendingConfirmCardProps) {
  const { choice, answer } = countQuestionTypes(item.questions)

  return (
    <div
      className={cn(
        "group relative flex h-36 w-[264px] shrink-0 flex-col overflow-hidden rounded-lg border bg-card p-4",
        "transition-all duration-200 hover:border-brand/40 hover:shadow-md",
        "cursor-pointer select-none"
      )}
      onClick={() => onConfirm?.(item.id)}
    >
      {/* 背景大图标 — 仿文件夹卡片样式 */}
      <SquareCheckBig className="pointer-events-none absolute top-10 right-6 size-20 translate-x-1/4 -translate-y-1/2 text-amber-600/10 dark:text-amber-400/8" />

      {/* 题目统计 — 上下布局 */}
      <div className="relative space-y-1.5">
        <p className="text-sm font-semibold">
          {item.questions.length} 个题目待确认
        </p>
        <div className="flex items-center gap-1.5 text-[11px]">
          {choice > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              选择题 {choice}
            </span>
          )}
          {answer > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              解答题 {answer}
            </span>
          )}
        </div>
      </div>

      {/* Spacer — 将底部行推到底部 */}
      <div className="flex-1" />

      {/* 底部：时间 + 操作菜单 */}
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {format(new Date(item.created_at), "yyyy/MM/dd HH:mm")}
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
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete?.(item.id)}
            >
              <Trash2 className="size-4" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
