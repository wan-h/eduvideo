import type { ShareVideoDesc } from "@/api/eduai/common.types"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import { useEffect, useMemo, useRef } from "react"

// 60 px/s — 慢速、可阅读
const SPEED_PX_PER_S = 60
// 导航切换时长 400ms ease-in-out
const NAV_DURATION_MS = 400
// 复制副本数：3 份足够无缝循环（可见区 < 1 份宽），减少 video 元素数量
const COPIES = 3

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

interface SharedVideoCarouselProps {
  videos: ShareVideoDesc[]
  isLoading?: boolean
}

export function SharedVideoCarousel({
  videos,
  isLoading,
}: SharedVideoCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  // 单份视频的宽度（像素），由 DOM 测量，精确避免 flex gap 累积误差
  const copyWidthRef = useRef(0)
  // 当前滚动偏移量（translateX 的绝对正值）
  const posRef = useRef(0)
  // rAF handle
  const rafRef = useRef(0)
  // 上一帧时间戳，用于计算 dt；null 表示"刚恢复，跳过第一帧"
  const lastTsRef = useRef<number | null>(null)

  // 动画状态：auto | paused | nav
  const modeRef = useRef<"auto" | "paused" | "nav">("auto")

  // nav 动画参数
  const navStartPosRef = useRef(0)
  const navTargetPosRef = useRef(0)
  const navStartTsRef = useRef(0)

  // 鼠标是否在轨道区域内
  const isHoverRef = useRef(false)

  // 渲染用的副本列表
  const displayVideos = useMemo(
    () => Array.from({ length: COPIES }, () => videos).flat(),
    [videos]
  )

  // ── 测量单份宽度，精确取第一张卡到第二份第一张卡的距离 ──
  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const measure = () => {
      const cards = track.children
      if (cards.length <= videos.length) return
      // 第二份第一张卡的 offsetLeft 即为单份宽度
      const cw = (cards[videos.length] as HTMLElement).offsetLeft
      if (cw <= 0) return
      copyWidthRef.current = cw
      // 初始落在第 2 份（index=1）起始位置，左右各有 1 份缓冲
      posRef.current = 1 * cw
      track.style.transform = `translateX(-${posRef.current}px)`
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    return () => ro.disconnect()
  }, [videos.length])

  // ── rAF 主循环 ──
  useEffect(() => {
    if (videos.length === 0) return

    const tick = (ts: number) => {
      const track = trackRef.current
      const cw = copyWidthRef.current

      if (track && cw > 0) {
        const mode = modeRef.current

        if (mode === "auto") {
          if (lastTsRef.current !== null) {
            // 限制单帧最大步长，防止切换标签页回来后跳帧
            const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05)
            posRef.current += SPEED_PX_PER_S * dt
            // 维持在 [1*cw, 2*cw)，无缝循环
            if (posRef.current >= 2 * cw) {
              posRef.current -= cw
            }
            track.style.transform = `translateX(-${posRef.current}px)`
          }
          lastTsRef.current = ts
        } else if (mode === "nav") {
          const elapsed = Math.max(0, ts - navStartTsRef.current)
          const t = Math.min(elapsed / NAV_DURATION_MS, 1)
          const eased = easeInOut(t)
          const pos =
            navStartPosRef.current +
            (navTargetPosRef.current - navStartPosRef.current) * eased
          posRef.current = pos
          track.style.transform = `translateX(-${pos}px)`

          if (t >= 1) {
            // 动画结束：归一化回 [1*cw, 2*cw)（视觉无跳变，各份内容一致）
            while (posRef.current < 1 * cw) posRef.current += cw
            while (posRef.current >= 2 * cw) posRef.current -= cw
            track.style.transform = `translateX(-${posRef.current}px)`
            // 重置 lastTs 避免下帧 dt 过大
            lastTsRef.current = null
            modeRef.current = isHoverRef.current ? "paused" : "auto"
          }
        }
        // "paused"：不更新位置
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [videos.length])

  // ── 鼠标进入/离开轨道区域 ──
  const handleMouseEnter = () => {
    isHoverRef.current = true
    if (modeRef.current === "auto") {
      modeRef.current = "paused"
      lastTsRef.current = null
    }
  }

  const handleMouseLeave = () => {
    isHoverRef.current = false
    if (modeRef.current === "paused") {
      modeRef.current = "auto"
      lastTsRef.current = null // 重置，避免暂停后第一帧大步长
    }
  }

  // ── 导航按钮：左 direction=-1 / 右 direction=1 ──
  const navigate = (direction: -1 | 1) => {
    if (modeRef.current === "nav") return // 动画中忽略重复点击
    const track = trackRef.current
    if (!track || track.children.length < 2) return

    // 精确取相邻卡片间距作为一格步长
    const c0 = (track.children[0] as HTMLElement).offsetLeft
    const c1 = (track.children[1] as HTMLElement).offsetLeft
    const cardStep = c1 - c0

    navStartPosRef.current = posRef.current
    navTargetPosRef.current = posRef.current + direction * cardStep
    navStartTsRef.current = performance.now()
    modeRef.current = "nav"
  }

  if (isLoading) {
    return (
      <section className="relative rounded-[2rem] border border-white/25 bg-white/40 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl md:p-6 dark:border-white/10 dark:bg-white/5 dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <div className="mb-4">
          <p className="text-xs font-semibold tracking-[0.28em] text-brand uppercase">
            Share
          </p>
          <h3 className="mt-2 text-lg font-semibold text-foreground md:text-xl">
            分享的创作视频
          </h3>
        </div>
        <div className="flex gap-6 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video w-[18rem] shrink-0 animate-pulse rounded-[1.5rem] bg-muted sm:w-[20rem]"
            />
          ))}
        </div>
      </section>
    )
  }

  if (videos.length === 0) return null

  return (
    <section className="relative rounded-[2rem] border border-white/25 bg-white/40 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl md:p-6 dark:border-white/10 dark:bg-white/5 dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
      {/* 标题区 */}
      <div className="mb-4">
        <p className="text-xs font-semibold tracking-[0.28em] text-brand uppercase">
          Share
        </p>
        <h3 className="mt-2 text-lg font-semibold text-foreground md:text-xl">
          分享的创作视频
        </h3>
      </div>

      {/* 轨道容器：overflow-hidden 裁剪 + CSS mask 渐隐边缘 */}
      <div
        className="group/carousel relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 滚动轨道：纯 transform，禁止任何 scroll-snap / overflow-scroll */}
        <div
          ref={trackRef}
          className="flex py-3"
          style={{ gap: "24px", willChange: "transform" }}
        >
          {displayVideos.map((video, index) => {
            return (
              <a
                key={index}
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="group/card relative block w-[18rem] shrink-0 overflow-hidden rounded-[1.5rem] border border-border/70 bg-black shadow-[0_20px_50px_rgba(15,23,42,0.18)] transition-transform duration-200 hover:scale-[1.02] sm:w-[20rem]"
              >
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                  <video
                    className="h-full w-full object-cover"
                    src={video.url}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="none"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
                  <div>
                    <p className="text-xs font-medium tracking-[0.24em] text-white/65 uppercase">
                      Featured
                    </p>
                    <p className="mt-2 text-sm font-semibold md:text-base">
                      {video.title}
                    </p>
                    <p className="mt-1 text-xs text-white/72">
                      点击后在新页面查看完整视频
                    </p>
                  </div>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/12 backdrop-blur-sm">
                    <ExternalLink className="size-4" />
                  </span>
                </div>
              </a>
            )
          })}
        </div>

        {/* 左箭头 wrapper：负责绝对定位 + 垂直居中，避免 Button 基类 active:translate-y-px 破坏居中 */}
        <div className="pointer-events-none absolute top-1/2 left-4 z-20 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover/carousel:pointer-events-auto group-hover/carousel:opacity-100">
          <Button
            aria-label="上一条视频"
            type="button"
            variant="outline"
            size="icon"
            className="pointer-events-auto size-10 rounded-full bg-background/90 shadow-lg"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>

        {/* 右箭头 wrapper：负责绝对定位 + 垂直居中，避免 Button 基类 active:translate-y-px 破坏居中 */}
        <div className="pointer-events-none absolute top-1/2 right-4 z-20 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover/carousel:pointer-events-auto group-hover/carousel:opacity-100">
          <Button
            aria-label="下一条视频"
            type="button"
            variant="outline"
            size="icon"
            className="pointer-events-auto size-10 rounded-full bg-background/90 shadow-lg"
            onClick={() => navigate(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
