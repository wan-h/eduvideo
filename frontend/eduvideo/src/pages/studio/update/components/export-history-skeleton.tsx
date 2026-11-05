import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/utils/cn"

function SkeletonBlock({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/50",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.5s_infinite]",
        "before:bg-gradient-to-r before:from-muted/50 before:via-muted before:to-muted/50",
        className
      )}
      {...props}
    />
  )
}

const SKELETON_ROWS = 5

/**
 * 列宽与 export-history-dialog.tsx 主表头保持一致。
 * 修改 dialog 表头时务必同步本数组。
 */
const COLUMN_WIDTHS: readonly (number | undefined)[] = [
  undefined,
  140,
  60,
  undefined,
  180,
]

const HEADER_LABELS = ["ID", "时间", "进度", "状态", "操作"] as const

export function ExportHistorySkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {HEADER_LABELS.map((label, i) => (
            <TableHead
              key={label}
              style={{ width: COLUMN_WIDTHS[i] }}
              className={
                i === HEADER_LABELS.length - 1 ? "text-right" : undefined
              }
            >
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: SKELETON_ROWS }).map((_, rowIdx) => (
          <TableRow key={rowIdx}>
            <TableCell>
              <SkeletonBlock className="h-3.5 w-24" />
            </TableCell>
            <TableCell>
              <SkeletonBlock className="h-3.5 w-28" />
            </TableCell>
            <TableCell>
              <SkeletonBlock className="h-3.5 w-10" />
            </TableCell>
            <TableCell>
              <SkeletonBlock className="h-5 w-16 rounded-full" />
            </TableCell>
            <TableCell className="text-right">
              <SkeletonBlock className="ml-auto h-6 w-6 rounded-md" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
