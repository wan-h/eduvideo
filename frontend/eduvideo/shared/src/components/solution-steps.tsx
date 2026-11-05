import { useMemo, type CSSProperties } from "react"
import { spring, useCurrentFrame, useVideoConfig } from "remotion"

import { useResolutionScale } from "../hooks/use-resolution-scale"
import { useStepScroll } from "../hooks/use-step-scroll"
import { MdRenderer } from "../markdown/md-renderer"
import { THEME } from "../styles/theme"
import type { FeSegment } from "../utils/schemas"
import { calcMdHeight, countLines } from "../utils/step-scroll"

export interface SolutionStepsProps {
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
const BASE_CONTENT_FONT_SIZE = 28
const TITLE_LINE_HEIGHT = 1.5
const CONTENT_LINE_HEIGHT = 1.7
const TITLE_WIDTH_RATIO = 0.16
const BASE_TITLE_PADDING_RIGHT = 20
const CONTENT_WIDTH_RATIO = 0.8
const BASE_MARGIN_BOTTOM = 24
const BASE_BOTTOM_PADDING = 160
const BASE_TOP_PADDING = 40

// ── 辅助解析函数 ──

function parseSegmentContent(rawContent?: string) {
  const imgs: { alt: string; src: string }[] = []
  let content = rawContent || ""

  const imgRegex = /!\[(.*?)\]\((.*?)\)/g
  let match
  while ((match = imgRegex.exec(content)) !== null) {
    imgs.push({ alt: match[1], src: match[2] })
  }
  content = content.replace(imgRegex, "").trim()

  const htmlImgRegex = /<img\s+[^>]*src="([^"]*)"[^>]*>/gi
  let htmlMatch
  while ((htmlMatch = htmlImgRegex.exec(content)) !== null) {
    const altMatch = htmlMatch[0].match(/alt="([^"]*)"/i)
    imgs.push({ alt: altMatch ? altMatch[1] : "", src: htmlMatch[1] })
  }
  content = content.replace(htmlImgRegex, "").trim()

  return { images: imgs, cleanContent: content }
}

// ── 渲染用布局组件 ──

function StepLayout({
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
  const titlePaddingRight = BASE_TITLE_PADDING_RIGHT * scale
  const marginBottom = BASE_MARGIN_BOTTOM * scale

  const { images, cleanContent } = useMemo(
    () => parseSegmentContent(segment.content),
    [segment.content]
  )

  const hasImage = images.length > 0

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        marginBottom: `${marginBottom}px`,
        position: "relative",
        ...style,
      }}
    >
      <div
        style={{
          width: `${TITLE_WIDTH_RATIO * 100}%`,
          paddingRight: `${titlePaddingRight}px`,
          fontWeight: "bold",
          color: THEME.colors.chalkYellow,
          textShadow: THEME.textShadow.chalk,
          letterSpacing: THEME.letterSpacing,
        }}
      >
        <MdRenderer
          content={segment.title}
          fontSize={isActive ? titleFontSize : titleFontSize * 0.93}
          color={THEME.colors.chalkYellow}
          lineHeight={TITLE_LINE_HEIGHT}
        />
      </div>

      {hasImage ? (
        <div
          style={{
            width: `${CONTENT_WIDTH_RATIO * 100}%`,
            marginLeft: "4%",
            display: "flex",
            flexDirection: "row",
            gap: `${24 * scale}px`,
          }}
        >
          <div style={{ flex: 1 }}>
            <MdRenderer
              content={cleanContent}
              fontSize={contentFontSize}
              lineHeight={CONTENT_LINE_HEIGHT}
              color={THEME.colors.chalkWhite}
            />
          </div>
          <div
            style={{
              width: "40%",
              display: "flex",
              flexDirection: "column",
              gap: `${12 * scale}px`,
              justifyContent: "center",
            }}
          >
            {images.map((img, idx) => (
              <img
                key={idx}
                src={img.src}
                alt={img.alt}
                style={{
                  maxWidth: "100%",
                  height:
                    images.length > 1 ? `${180 * scale}px` : `${280 * scale}px`,
                  objectFit: "contain",
                  borderRadius: `${6 * scale}px`,
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            width: `${CONTENT_WIDTH_RATIO * 100}%`,
            marginLeft: "4%",
          }}
        >
          <MdRenderer
            content={segment.content}
            fontSize={contentFontSize}
            lineHeight={CONTENT_LINE_HEIGHT}
            color={THEME.colors.chalkWhite}
            imageHeight={280 * scale}
          />
        </div>
      )}
    </div>
  )
}

// ── 主组件 ──

export function SolutionSteps({
  segments,
  startFrame,
  skipEntrance = false,
  splitLayout = false,
}: SolutionStepsProps) {
  const frame = useCurrentFrame()
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig()
  const scale = useResolutionScale()
  const localFrame = frame - startFrame

  const titleFontSize = BASE_TITLE_FONT_SIZE * scale
  const contentFontSize = BASE_CONTENT_FONT_SIZE * scale
  const titlePaddingRight = BASE_TITLE_PADDING_RIGHT * scale
  const marginBottom = BASE_MARGIN_BOTTOM * scale
  const bottomPadding = BASE_BOTTOM_PADDING * scale
  const topPadding = BASE_TOP_PADDING * scale

  // ── 步骤高度估算 ──
  const stepHeights = useMemo(() => {
    const outerWidth = splitLayout ? videoWidth * 0.65 : videoWidth * 0.92
    const titleWidth = outerWidth * TITLE_WIDTH_RATIO - titlePaddingRight
    const contentWidth = outerWidth * CONTENT_WIDTH_RATIO

    return segments.map((seg) => {
      const titleLines = countLines(
        seg.title,
        titleFontSize,
        titleWidth,
        THEME.fontFamily
      )
      const titleHeight = titleLines * titleFontSize * TITLE_LINE_HEIGHT

      const { images, cleanContent } = parseSegmentContent(seg.content)

      let contentHeight = 0
      if (images.length > 0) {
        // 左右分布布局：文字在左（flex: 1），图片在右（width: 40%），间距 24px
        const textColumnWidth = contentWidth * 0.6 - 24 * scale
        const textHeight = calcMdHeight({
          md: cleanContent,
          fontSize: contentFontSize,
          lineHeight: CONTENT_LINE_HEIGHT,
          maxWidth: textColumnWidth,
          fontFamily: THEME.fontFamily,
          scale,
        })

        // 右侧图片列高度：单张 280px，多张每张 180px + 12px 间距
        const imageColumnHeight =
          images.length === 1
            ? 280 * scale
            : (images.length * 180 + (images.length - 1) * 12) * scale

        // 左右分布，高度取除图片外文本高度与图片列高度的较大者
        contentHeight = Math.max(textHeight, imageColumnHeight)
      } else {
        contentHeight = calcMdHeight({
          md: seg.content,
          fontSize: contentFontSize,
          lineHeight: CONTENT_LINE_HEIGHT,
          maxWidth: contentWidth,
          fontFamily: THEME.fontFamily,
          scale,
        })
      }

      return Math.ceil(Math.max(titleHeight, contentHeight) + marginBottom)
    })
  }, [
    segments,
    videoWidth,
    titleFontSize,
    titlePaddingRight,
    contentFontSize,
    marginBottom,
    scale,
    splitLayout,
  ])

  // ── 每个步骤的起始帧 ──
  const stepStartFrames = useMemo(() => {
    const frames: number[] = []
    let accumulated = 0
    for (const segment of segments) {
      frames.push(accumulated)
      const segmentDuration = segment.subtitles.reduce(
        (sum, sub) => sum + sub.duration,
        0
      )
      accumulated += Math.floor((segmentDuration / 1000) * fps)
    }
    return frames
  }, [segments, fps])

  // ── 当前步骤索引 ──
  const currentStepIndex = useMemo(() => {
    let current = -1
    for (let i = 0; i < stepStartFrames.length; i++) {
      if (localFrame >= stepStartFrames[i]) {
        current = i
      }
    }
    return current
  }, [localFrame, stepStartFrames])

  // ── 可视区域 ──
  const visibleHeight = useMemo(() => {
    // 考虑 ContentArea 的 titleBar 高度占比 (6%) 导致 contentNode 实际可用高度为 94%，
    // 并且减去 ContentArea 的 paddingBottom (40 * scale) 和 SolutionSteps 的 bottomPadding
    const contentNodeVisibleHeight = videoHeight * 0.84 * 0.94 - 40 * scale
    return Math.max(100, contentNodeVisibleHeight - bottomPadding)
  }, [videoHeight, scale, bottomPadding])

  // ── 滚动 ──
  const animatedScrollY = useStepScroll({
    stepHeights,
    stepGap: 0,
    currentIndex: currentStepIndex,
    visibleHeight,
    topPadding,
    localFrame,
    fps,
    stepStartFrame:
      currentStepIndex >= 0 ? stepStartFrames[currentStepIndex] : 0,
  })

  // ── 状态机 ──
  const getStepStyle = (stepIndex: number): CSSProperties => {
    if (stepIndex > currentStepIndex) {
      return { opacity: 0, transform: "scale(0.97)" }
    }
    if (stepIndex < currentStepIndex) {
      return { opacity: 0.45, transform: "scale(0.97)" }
    }
    if (skipEntrance) return { opacity: 1, transform: "none" }
    const frameDiff = localFrame - stepStartFrames[stepIndex]
    const opacity = spring({
      frame: frameDiff,
      fps,
      config: { damping: 14 },
    })
    return {
      opacity,
      transform: `translateY(${(1 - opacity) * 20 * scale}px)`,
    }
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        paddingBottom: bottomPadding,
        boxSizing: "border-box",
      }}
    >
      {/* 固定竖线 — 标题与内容之间的分隔 */}
      <div
        style={{
          position: "absolute",
          left: "18%",
          top: 0,
          bottom: 0,
          width: `${3 * scale}px`,
          backgroundColor: THEME.colors.divider,
        }}
      />
      <div style={{ transform: `translateY(-${animatedScrollY}px)` }}>
        {segments.map((segment, index) => {
          if (index > currentStepIndex) return null
          const animationStyle = getStepStyle(index)
          const isActive = index === currentStepIndex

          return (
            <StepLayout
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
