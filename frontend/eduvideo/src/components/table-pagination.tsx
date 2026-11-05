import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination"
import { ChevronLeft, ChevronRight } from "lucide-react"

type PaginationVariant = "simple" | "detailed"

interface TablePaginationProps {
  pageIndex: number
  pageSize: number
  total: number
  onPageChange: (pageIndex: number) => void
  loading?: boolean
  /** 分页器形态：simple 简洁版 / detailed 详细版（含页码按钮+条数信息），默认 simple */
  variant?: PaginationVariant
}

export function TablePagination({
  pageIndex,
  pageSize,
  total,
  onPageChange,
  loading = false,
  variant = "simple",
}: TablePaginationProps) {
  const totalPages = Math.ceil(total / pageSize) || 1

  if (total === 0) return null

  if (variant === "detailed") {
    return (
      <DetailedPagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    )
  }

  const canPrevious = pageIndex > 0
  const canNext = pageIndex < totalPages - 1

  return (
    <div className="mt-4 flex items-center justify-center gap-4">
      <Button
        variant="outline"
        size="sm"
        disabled={!canPrevious || loading}
        onClick={() => onPageChange(pageIndex - 1)}
      >
        <ChevronLeft className="mr-1 size-4" />
        上一页
      </Button>

      <span className="text-sm text-muted-foreground">
        第 {pageIndex + 1} / {totalPages} 页
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={!canNext || loading}
        onClick={() => onPageChange(pageIndex + 1)}
      >
        下一页
        <ChevronRight className="ml-1 size-4" />
      </Button>
    </div>
  )
}

/* ── 详细版分页器 ── */

function DetailedPagination({
  pageIndex,
  pageSize,
  total,
  onPageChange,
}: Omit<TablePaginationProps, "loading" | "variant">) {
  const totalPages = Math.ceil(total / pageSize) || 1
  const start = pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, total)

  const getPageNumbers = (): (number | string)[] => {
    const page = pageIndex + 1
    const pages: (number | string)[] = []
    const showEllipsis = totalPages > 7

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }

    pages.push(1)
    if (page > 3) pages.push("...")

    const s = Math.max(2, page - 1)
    const e = Math.min(totalPages - 1, page + 1)
    for (let i = s; i <= e; i++) pages.push(i)

    if (page < totalPages - 2) pages.push("...")
    pages.push(totalPages)

    return pages
  }

  const canPrevious = pageIndex > 0
  const canNext = pageIndex < totalPages - 1

  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-xs text-muted-foreground">
        第 {start}-{end} 条，共 {total} 条
      </span>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationLink
              aria-label="上一页"
              onClick={() => onPageChange(pageIndex - 1)}
              className={
                canPrevious
                  ? "cursor-pointer"
                  : "pointer-events-none opacity-50"
              }
              size="icon"
            >
              <ChevronLeft className="size-4" />
            </PaginationLink>
          </PaginationItem>

          {getPageNumbers().map((p, i) =>
            p === "..." ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={p === pageIndex + 1}
                  onClick={() => onPageChange((p as number) - 1)}
                  className="cursor-pointer text-xs"
                  size="sm"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationLink
              aria-label="下一页"
              onClick={() => onPageChange(pageIndex + 1)}
              className={
                canNext ? "cursor-pointer" : "pointer-events-none opacity-50"
              }
              size="icon"
            >
              <ChevronRight className="size-4" />
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
