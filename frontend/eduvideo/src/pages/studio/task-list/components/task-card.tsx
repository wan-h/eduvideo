import {
  getScriptTaskStatus,
  retryScriptTask,
  updateScriptTaskResult,
} from "@/api/eduai/script"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { STATUS_CONFIG } from "@/pages/studio/task-list/constants"
import type { TaskStatus } from "@/pages/studio/task-list/types"
import { API_STATUS_MAP } from "@/pages/studio/task-list/types"
import { queryKeys } from "@/services/query-client"
import { cn } from "@/utils/cn"
import { MdRenderer } from "@ask2vid/shared"
import { useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  Check,
  Copy,
  FolderInputIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCw,
  Trash2,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { useInlineRename } from "../hooks/use-inline-rename"

export interface TaskCardData {
  id: string
  status: number
  progress: number
  created_at?: string
  text: string
  title?: string
  message?: string
}

export interface TaskCardProps {
  task: TaskCardData
  selectable?: boolean
  selected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  onDelete?: (id: string) => void
  onMove?: (id: string) => void
  onRefresh?: () => void
  compact?: boolean
}

function getTaskTitle(status: TaskStatus, title?: string): string {
  if (status === "processing") return "生成中..."
  if (status === "pending") return "等待中..."
  if (status === "failed") return "生成失败"
  return title || "未命名任务"
}

export function TaskCard({
  task,
  selectable = false,
  selected = false,
  onSelect,
  onDelete,
  onMove,
  onRefresh,
  compact = false,
}: TaskCardProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const status: TaskStatus = API_STATUS_MAP[task.status] ?? "pending"
  const isCompleted = status === "completed"
  const statusConfig = STATUS_CONFIG[status]
  const [copied, setCopied] = useState(false)
  const [retrying, setRetrying] = useState(false)

  // Popover hover: 300ms 打开延迟 + 150ms 关闭延迟，避免鼠标在两元素间移动时闪烁
  const [promptOpen, setPromptOpen] = useState(false)
  const openTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handlePromptEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (!promptOpen) {
      openTimerRef.current = setTimeout(() => setPromptOpen(true), 300)
    }
  }

  const handlePromptLeave = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    closeTimerRef.current = setTimeout(() => setPromptOpen(false), 150)
  }

  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const handleCopyId = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      navigator.clipboard.writeText(task.id).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    },
    [task.id]
  )

  const handleRetry = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      setRetrying(true)
      try {
        await retryScriptTask(task.id)
        toast.success("已提交重试，请等待生成")
        // 重试后服务端已重置任务状态，需失效首页最近任务与「我的项目」两套列表缓存
        queryClient.invalidateQueries({ queryKey: queryKeys.scripts.all })
        queryClient.invalidateQueries({ queryKey: ["workspace"] })
        onRefresh?.()
      } catch {
        toast.error("重试失败，请稍后再试")
      } finally {
        setRetrying(false)
      }
    },
    [task.id, onRefresh, queryClient]
  )

  const handleSave = useCallback(
    async (name: string) => {
      const info = await getScriptTaskStatus(task.id)
      if (!info.result) {
        toast.error("任务结果为空")
        return
      }
      const parsed = JSON.parse(info.result)
      parsed.question_metadata.title = name
      await updateScriptTaskResult(task.id, { script: JSON.stringify(parsed) })
      onRefresh?.()
    },
    [task.id, onRefresh]
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

  const handleCardClick = () => {
    if (editing) return
    if (selectable) {
      onSelect?.(task.id, !selected)
      return
    }
    if (isCompleted) {
      navigate(`/studio/${task.id}`)
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full rounded-lg border bg-card p-4 transition-shadow",
        !selectable && isCompleted && "cursor-pointer hover:shadow-md",
        selectable && "cursor-pointer",
        selected && "ring-2 ring-brand"
      )}
      onClick={handleCardClick}
    >
      {selectable && (
        <div className="absolute top-3 left-3 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={(value) => onSelect?.(task.id, !!value)}
            onClick={(e) => e.stopPropagation()}
            aria-label="选择任务"
            className="data-checked:border-brand data-checked:bg-brand data-checked:text-brand-foreground"
          />
        </div>
      )}

      <div className={cn("space-y-3", selectable && "pl-7")}>
        {/* Title */}
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
          <h3
            className={cn(
              "truncate text-sm font-semibold",
              status === "failed" && "text-red-600",
              status === "processing" && "text-blue-600",
              status === "pending" && "text-amber-600"
            )}
          >
            {getTaskTitle(status, task.title)}
          </h3>
        )}

        {/* Prompt / Error message */}
        {status === "failed" ? (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="min-w-0 flex-1 truncate text-xs text-red-500">
                  {task.message || "生成失败，点击复制任务 ID 联系管理员"}
                </p>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span className="text-xs">
                  {task.message || "生成失败，请点击复制任务 ID 联系管理员"}
                </span>
              </TooltipContent>
            </Tooltip>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50"
              onClick={handleCopyId}
            >
              {copied ? (
                <Check className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
              {copied ? "已复制" : "复制id"}
            </button>
            <button
              type="button"
              disabled={retrying}
              className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
              onClick={handleRetry}
            >
              {retrying ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RotateCw className="size-3" />
              )}
              重试
            </button>
          </div>
        ) : task.text ? (
          <Popover open={promptOpen} onOpenChange={setPromptOpen}>
            <PopoverTrigger asChild>
              <div
                className="line-clamp-1 cursor-default text-xs text-muted-foreground"
                onMouseEnter={handlePromptEnter}
                onMouseLeave={handlePromptLeave}
              >
                <MdRenderer content={task.text} mode="preview" fontSize={12} />
              </div>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              className="max-h-80 max-w-md overflow-y-auto"
              onMouseEnter={handlePromptEnter}
              onMouseLeave={handlePromptLeave}
            >
              <MdRenderer content={task.text} mode="full" fontSize={13} />
            </PopoverContent>
          </Popover>
        ) : (
          <p className="text-xs text-muted-foreground"> </p>
        )}

        {/* Status + Progress */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              statusConfig.className
            )}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </span>
          {status === "processing" && (
            <div className="flex-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer: Time + Delete */}
        {!compact && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {task.created_at
                ? format(new Date(task.created_at), "yyyy/MM/dd HH:mm")
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
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                {isCompleted && (
                  <DropdownMenuItem
                    onClick={() => startEditing(task.title || "")}
                  >
                    <Pencil className="size-4" />
                    重命名
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onMove?.(task.id)}>
                  <FolderInputIcon className="size-4" />
                  移动到文件夹
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete?.(task.id)}
                >
                  <Trash2 className="size-4" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  )
}
