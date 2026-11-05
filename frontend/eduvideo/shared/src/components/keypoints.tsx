import { useMemo, type CSSProperties } from "react"
import { spring, useCurrentFrame, useVideoConfig } from "remotion"

import { useResolutionScale } from "../hooks/use-resolution-scale"
import { useStepScroll } from "../hooks/use-step-scroll"
import { MdRenderer } from "../markdown/md-renderer"
import { THEME } from "../styles/theme"
import type { FeSegment } from "../utils/schemas"
import { calcMdHeight, countLines } from "../utils/step-scroll"

export interface KeypointsProps {
  segments: FeSegment[]
  /** 当前场景在整个视频中的全局起始帧号 */
  startFrame: number
  /** 跳过入场动画，直接以终态渲染（首场景预览优化） */
  skipEntrance?: boolean
  /** 是否处于双栏分屏模式 */
  splitLayout?: boolean
}

// ── 1080p 设计基准值 ──

const BASE_TITLE_FONT_SIZE = 28
const BASE_CONTENT_FONT_SIZE = 26
const TITLE_LINE_HEIGHT = 1.5
const CONTENT_LINE_HEIGHT = 1.7
const BASE_INNER_PADDING = 48 // 24px × 2
const BASE_GAP = 20
const BASE_STEP_GAP = 32
const BASE_TOP_PADDING = 20
const BASE_BOTTOM_PADDING = 40

// ── 渲染用布局组件 ──

function SegmentLayout({
  segment,
  isActive,
  style,
  scale,
}: {
  segment: FeSegment
  isActive: boolean
  style?: CSSProperties
  scale: number
}) {
  const titleFontSize = BASE_TITLE_FONT_SIZE * scale
  const contentFontSize = BASE_CONTENT_FONT_SIZE * scale
  const padding = 24 * scale
  const gap = BASE_GAP * scale

  return (
    <div
      style={{
        padding: `${padding}px`,
        gap: `${gap}px`,
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {!segment.title ? null : (
        <div
          style={{
            fontWeight: "bold",
            color: THEME.colors.chalkYellow,
            textShadow: THEME.textShadow.chalk,
            letterSpacing: THEME.letterSpacing,
          }}
        >
          <MdRenderer
            content={segment.title}
            fontSize={isActive ? titleFontSize : contentFontSize}
            color={THEME.colors.chalkYellow}
            lineHeight={TITLE_LINE_HEIGHT}
          />
        </div>
      )}
      {!segment.content ? null : (
        <MdRenderer
          content={segment.content}
          fontSize={contentFontSize}
          lineHeight={CONTENT_LINE_HEIGHT}
          color={THEME.colors.chalkWhite}
          imageHeight={280 * scale}
        />
      )}
    </div>
  )
}

// ── 主组件 ──

export function Keypoints({
  segments,
  startFrame,
  skipEntrance = false,
  splitLayout = false,
}: KeypointsProps) {
  const frame = useCurrentFrame()
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig()
  const scale = useResolutionScale()
  const localFrame = frame - startFrame

  const titleFontSize = BASE_TITLE_FONT_SIZE * scale
  const contentFontSize = BASE_CONTENT_FONT_SIZE * scale
  const innerPadding = BASE_INNER_PADDING * scale
  const gap = BASE_GAP * scale
  const stepGap = BASE_STEP_GAP * scale
  const topPadding = BASE_TOP_PADDING * scale
  const bottomPadding = BASE_BOTTOM_PADDING * scale

  // ── 步骤高度估算 ──
  const stepHeights = useMemo(() => {
    const contentWidth = (splitLayout ? videoWidth * 0.65 : videoWidth * 0.92) - innerPadding

    return segments.map((seg) => {
      let h = innerPadding

      if (seg.title) {
        const titleLines = countLines(
          seg.title,
          titleFontSize,
          contentWidth,
          THEME.fontFamily
        )
        h += titleLines * titleFontSize * TITLE_LINE_HEIGHT
      }

      if (seg.content) {
        if (seg.title) h += gap
        h += calcMdHeight({
          md: seg.content,
          fontSize: contentFontSize,
          lineHeight: CONTENT_LINE_HEIGHT,
          maxWidth: contentWidth,
          fontFamily: THEME.fontFamily,
          scale,
        })
      }

      return Math.ceil(h)
    })
  }, [
    segments,
    videoWidth,
    titleFontSize,
    contentFontSize,
    innerPadding,
    gap,
    scale,
    splitLayout,
  ])

  // ── 每段起始帧 ──
  const segmentStartFrames = useMemo(() => {
    const frames: number[] = []
    let accumulated = 0
    for (const segment of segments) {
      frames.push(accumulated)
      const duration = segment.subtitles.reduce(
        (sum, sub) => sum + sub.duration,
        0
      )
      accumulated += Math.floor((duration / 1000) * fps)
    }
    return frames
  }, [segments, fps])

  // ── 当前段索引 ──
  const currentIndex = useMemo(() => {
    let current = -1
    for (let i = 0; i < segmentStartFrames.length; i++) {
      if (localFrame >= segmentStartFrames[i]) {
        current = i
      }
    }
    return current
  }, [localFrame, segmentStartFrames])

  // ── 可视区域 ──
  const visibleHeight = useMemo(() => {
    return videoHeight * 0.84 - topPadding - bottomPadding
  }, [videoHeight, topPadding, bottomPadding])

  // ── 滚动 ──
  const animatedScrollY = useStepScroll({
    stepHeights,
    stepGap,
    currentIndex,
    visibleHeight,
    topPadding,
    localFrame,
    fps,
    stepStartFrame: currentIndex >= 0 ? segmentStartFrames[currentIndex] : 0,
  })

  // ── 状态机 ──
  const getSegmentStyle = (index: number): CSSProperties => {
    if (index > currentIndex) {
      return { opacity: 0, transform: "scale(0.98)" }
    }
    if (index < currentIndex) {
      return { opacity: 0.7, transform: "scale(0.98)" }
    }
    if (skipEntrance) return { opacity: 1, transform: "scale(1)" }
    const frameDiff = localFrame - segmentStartFrames[index]
    const opacity = spring({
      frame: frameDiff,
      fps,
      config: { damping: 14 },
    })
    return {
      opacity,
      transform: `scale(${0.98 + opacity * 0.02})`,
    }
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        paddingTop: topPadding,
        paddingBottom: bottomPadding,
        boxSizing: "border-box",
      }}
    >
      <div style={{ transform: `translateY(-${animatedScrollY}px)` }}>
        {segments.map((segment, index) => {
          if (index > currentIndex) return null
          const animationStyle = getSegmentStyle(index)
          const isActive = index === currentIndex

          return (
            <SegmentLayout
              key={segment.id}
              segment={segment}
              isActive={isActive}
              style={animationStyle}
              scale={scale}
            />
          )
        })}
      </div>
    </div>
  )
}
