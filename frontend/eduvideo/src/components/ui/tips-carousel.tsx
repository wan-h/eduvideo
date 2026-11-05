"use no memo"

import { cn } from "@/utils/cn"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

interface TipsCarouselProps {
  items: string[]
  /** 自动切换间隔（毫秒），默认 5000 */
  interval?: number
  /** 单条 tip 的自定义渲染，默认纯文本 */
  renderItem?: (item: string, index: number) => React.ReactNode
  className?: string
}

/**
 * 通用提示轮播组件。
 *
 * 自动轮播 + 手动左右箭头 + 淡入淡出动画 + 底部圆点指示器 + 循环。
 * 仅当 items 存在且长度 > 1 时启用轮播交互。
 */
export function TipsCarousel({
  items,
  interval = 5000,
  renderItem,
  className,
}: TipsCarouselProps) {
  const [active, setActive] = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const len = items.length
  const hasMultiple = len > 1

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    if (!hasMultiple) return
    stopTimer()
    timerRef.current = setInterval(() => {
      setVisible(false)
    }, interval)
  }, [hasMultiple, interval, stopTimer])

  // 淡出 → 切索引 → 淡入
  const goTo = useCallback((next: number) => {
    setVisible(false)
    setTimeout(() => {
      setActive(next)
      setVisible(true)
    }, 150)
  }, [])

  const prev = useCallback(() => {
    stopTimer()
    goTo(active === 0 ? len - 1 : active - 1)
    startTimer()
  }, [active, len, goTo, stopTimer, startTimer])

  const next = useCallback(() => {
    stopTimer()
    goTo(active === len - 1 ? 0 : active + 1)
    startTimer()
  }, [active, len, goTo, stopTimer, startTimer])

  // fade-out 结束时自动切下一条
  const handleTransitionEnd = useCallback(() => {
    if (!visible) {
      const nextIdx = active === len - 1 ? 0 : active + 1
      setActive(nextIdx)
      setVisible(true)
    }
  }, [visible, active, len])

  // 启动自动轮播
  useEffect(() => {
    startTimer()
    return stopTimer
  }, [startTimer, stopTimer])

  // 只有一条时不显示交互控件
  if (len === 0) return null

  const currentItem = items[active]

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {hasMultiple && (
        <button
          type="button"
          className="flex size-5 shrink-0 items-center justify-center rounded-full text-current opacity-50 transition-opacity hover:opacity-100"
          onClick={prev}
          aria-label="上一条"
        >
          <ChevronLeft className="size-3.5" />
        </button>
      )}

      <span
        className="min-w-0 flex-1 text-xs transition-opacity duration-150"
        style={{ opacity: visible ? 1 : 0 }}
        onTransitionEnd={handleTransitionEnd}
      >
        {renderItem ? renderItem(currentItem, active) : currentItem}
      </span>

      {hasMultiple && (
        <button
          type="button"
          className="flex size-5 shrink-0 items-center justify-center rounded-full text-current opacity-50 transition-opacity hover:opacity-100"
          onClick={next}
          aria-label="下一条"
        >
          <ChevronRight className="size-3.5" />
        </button>
      )}

      {hasMultiple && (
        <div className="flex shrink-0 items-center gap-1">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              className={cn(
                "size-1.5 rounded-full transition-all",
                i === active
                  ? "bg-current opacity-80"
                  : "bg-current opacity-30 hover:opacity-50"
              )}
              onClick={() => {
                stopTimer()
                goTo(i)
                startTimer()
              }}
              aria-label={`第 ${i + 1} 条`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
