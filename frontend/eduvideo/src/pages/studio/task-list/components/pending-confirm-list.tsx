import type { QuestionExtractConfirmInfo } from "@/api/eduai/question-extract.types"
import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { PendingConfirmCard } from "./pending-confirm-card"
import { SectionHeader } from "./section-header"

interface PendingConfirmListProps {
  items: QuestionExtractConfirmInfo[]
  onConfirm?: (id: string) => void
  onDelete?: (id: string) => void
  onRefresh?: () => void
  isRefetching?: boolean
  className?: string
}

/** 计算两侧渐变遮罩 */
function maskStyle(
  left: boolean,
  right: boolean
): React.CSSProperties | undefined {
  if (!left && !right) return undefined
  if (left && right) {
    return {
      WebkitMaskImage:
        "linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%)",
    }
  }
  if (left) {
    return {
      WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 4%)",
    }
  }
  return {
    WebkitMaskImage: "linear-gradient(to left, transparent 0%, black 4%)",
  }
}

export function PendingConfirmList({
  items,
  onConfirm,
  onDelete,
  onRefresh,
  isRefetching = false,
  className,
}: PendingConfirmListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener("scroll", updateScrollState, { passive: true })
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", updateScrollState)
      ro.disconnect()
    }
  }, [items, updateScrollState])

  // 鼠标滚轮 → 水平惯性滚动
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let velocity = 0
    let rafId = 0
    const FRICTION = 0.92
    const MIN_VELOCITY = 0.5

    const animate = () => {
      velocity *= FRICTION
      if (Math.abs(velocity) < MIN_VELOCITY) {
        rafId = 0
        return
      }
      el.scrollBy({ left: velocity, behavior: "auto" })
      rafId = requestAnimationFrame(animate)
    }

    const startLoop = () => {
      if (rafId) return
      rafId = requestAnimationFrame(animate)
    }

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      velocity += e.deltaY * 1.5
      // 限制最大速度避免飞出
      if (velocity > 80) velocity = 80
      if (velocity < -80) velocity = -80
      startLoop()
    }

    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => {
      el.removeEventListener("wheel", handleWheel)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  const scrollPage = (direction: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = 264 + 16 // card width + gap
    const visibleCards = Math.floor(el.clientWidth / cardWidth) || 1
    const scrollAmount = cardWidth * visibleCards
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  if (items.length === 0) return null

  return (
    <div className={cn("space-y-4", className)}>
      <SectionHeader title="待确认" count={items.length}>
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={onRefresh}
          >
            <RefreshCw
              className={cn("size-3.5", isRefetching && "animate-spin")}
            />
          </Button>
        )}
      </SectionHeader>

      {/* 滚动区域 */}
      <div className="relative">
        {/* 左箭头 */}
        {canScrollLeft && (
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "absolute top-1/2 -left-3 z-10 size-8 -translate-y-1/2 rounded-full",
              "border bg-card shadow-md hover:bg-accent"
            )}
            onClick={() => scrollPage("left")}
          >
            <ChevronLeft className="size-4" />
          </Button>
        )}

        {/* 卡片行 */}
        <div
          ref={scrollRef}
          className="scrollbar-hide flex gap-4 overflow-x-auto pb-1"
          style={maskStyle(canScrollLeft, canScrollRight)}
        >
          {items.map((item) => (
            <PendingConfirmCard
              key={item.id}
              item={item}
              onConfirm={onConfirm}
              onDelete={onDelete}
            />
          ))}
        </div>

        {/* 右箭头 */}
        {canScrollRight && (
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "absolute top-1/2 -right-3 z-10 size-8 -translate-y-1/2 rounded-full",
              "border bg-card shadow-md hover:bg-accent"
            )}
            onClick={() => scrollPage("right")}
          >
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
