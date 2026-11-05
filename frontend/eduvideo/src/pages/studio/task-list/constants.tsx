import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react"
import type { TaskStatus } from "./types"

export const PAGE_SIZE = 12

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  pending: {
    label: "等待中",
    icon: <Clock className="size-3.5" />,
    className:
      "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
  },
  processing: {
    label: "处理中",
    icon: <Loader2 className="size-3.5 animate-spin" />,
    className:
      "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400",
  },
  completed: {
    label: "已完成",
    icon: <CheckCircle2 className="size-3.5" />,
    className:
      "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  failed: {
    label: "失败",
    icon: <XCircle className="size-3.5" />,
    className: "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
  },
}
