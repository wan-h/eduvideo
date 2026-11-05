import { useMemo } from "react"
import { spring, useCurrentFrame, useVideoConfig } from "remotion"

import { useResolutionScale } from "../hooks/use-resolution-scale"
import {
  MdRenderer,
  mergeConsecutiveImages,
} from "../markdown/md-renderer"
import { THEME } from "../styles/theme"
import { calcMdHeight } from "../utils/step-scroll"

export interface QuestionContextCardProps {
  stem: string
  options?: string[]
  /** 本场景在视频中的全局起始帧号 */
  startFrame?: number
  /** 本场景的总帧数（用于分段滚动的时间分配） */
  durationInFrames?: number
  style?: React.CSSProperties
}

const BASE_STEM_FONT_SIZE = 20
const BASE_OPTION_FONT_SIZE = 18
const STEM_LINE_HEIGHT = 1.5
const OPTION_LINE_HEIGHT = 1.4

// 测量安全系数，补偿段落边距与各种格式化开销
const MEASURE_SAFETY_FACTOR = 1.2

export function QuestionContextCard({
  stem,
  options = [],
  startFrame,
  durationInFrames,
  style,
}: QuestionContextCardProps) {
  const scale = useResolutionScale()
  const frame = useCurrentFrame()
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig()

  const stemFontSize = BASE_STEM_FONT_SIZE * scale
  const optionFontSize = BASE_OPTION_FONT_SIZE * scale
  const padding = 16 * scale
  const gap = 12 * scale
  const borderRadius = 10 * scale
  const badgeFontSize = 14 * scale
  const stemImageH = 180 * scale
  const optionImageH = 120 * scale

  // 连续图片合并为同一段落：多图横向居中，放不下自动换行
  const displayStem = useMemo(() => mergeConsecutiveImages(stem), [stem])
  const validOptions = useMemo(
    () =>
      options
        .filter((o) => o.trim() !== "")
        .map((o) => mergeConsecutiveImages(o)),
    [options]
  )

  // ── 精准计算卡片可用宽度、高度与内容总高度 ──
  const contentPaddingX = 76.8 * scale
  const contentWidth = videoWidth - contentPaddingX * 2
  const cardWidth = contentWidth * 0.32
  const cardTextWidth = Math.max(100, cardWidth - padding * 2)

  // ContentArea 底部 padding 为 40 * scale
  const contentAreaPaddingBottom = 40 * scale
  const cardContainerH = videoHeight * 0.84 - contentAreaPaddingBottom
  const badgeHeight = badgeFontSize + 4 * scale
  const containerAvailableH = Math.max(
    100,
    cardContainerH - padding * 2 - badgeHeight - gap
  )

  const rawTotalH = useMemo(() => {
    const stemH = calcMdHeight({
      md: displayStem,
      fontSize: stemFontSize,
      lineHeight: STEM_LINE_HEIGHT,
      maxWidth: cardTextWidth,
      fontFamily: THEME.fontFamily,
      scale,
      imageHeight: stemImageH,
    })

    let optionsH = 0
    if (validOptions.length > 0) {
      for (const opt of validOptions) {
        optionsH +=
          calcMdHeight({
            md: opt,
            fontSize: optionFontSize,
            lineHeight: OPTION_LINE_HEIGHT,
            maxWidth: cardTextWidth - 24 * scale,
            fontFamily: THEME.fontFamily,
            scale,
            imageHeight: optionImageH,
          }) +
          16 * scale +
          8 * scale
      }
    }

    return stemH + (validOptions.length > 0 ? optionsH + 4 * scale : 0)
  }, [
    displayStem,
    validOptions,
    stemFontSize,
    optionFontSize,
    cardTextWidth,
    scale,
    stemImageH,
    optionImageH,
  ])

  // 应用 1.2× 安全系数，确保完全涵盖 Markdown 段落边距，保证滚动到底
  const totalH = rawTotalH * MEASURE_SAFETY_FACTOR
  const scrollTarget = Math.max(0, totalH - containerAvailableH)

  // ── 帧驱动平滑滚动 ──
  const localFrame = startFrame !== undefined ? frame - startFrame : 0
  const scrollY = useMemo(() => {
    if (
      scrollTarget <= 0 ||
      durationInFrames === undefined ||
      durationInFrames <= 0
    ) {
      return 0
    }
    const SCROLL_DELAY = 15
    const activeFrame = localFrame - SCROLL_DELAY
    if (activeFrame <= 0) return 0

    const springProgress = spring({
      frame: activeFrame,
      fps,
      config: { damping: 20, stiffness: 80 },
    })

    return Math.min(springProgress * scrollTarget, scrollTarget)
  }, [scrollTarget, localFrame, durationInFrames, fps])

  return (
    <div
      className="no-scrollbar"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        boxSizing: "border-box",
        backgroundColor: "rgba(15, 25, 22, 0.35)",
        border: "1px solid rgba(255, 235, 59, 0.2)",
        borderRadius: `${borderRadius}px`,
        padding: `${padding}px`,
        overflow: "hidden",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        backdropFilter: "blur(4px)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
        opacity: 0.85,
        ...style,
      }}
    >
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* 1. 卡片头部标签（固定置顶于视口上方） */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          alignSelf: "flex-start",
          padding: `${2 * scale}px ${8 * scale}px`,
          backgroundColor: "rgba(255, 235, 59, 0.15)",
          border: "1px solid rgba(255, 235, 59, 0.4)",
          borderRadius: `${4 * scale}px`,
          color: THEME.colors.chalkYellow,
          fontSize: `${badgeFontSize}px`,
          fontWeight: "bold",
          letterSpacing: THEME.letterSpacing,
          flexShrink: 0,
          marginBottom: `${gap}px`,
          zIndex: 2,
        }}
      >
        原题内容
      </div>

      {/* 2. 专属滚动视口：限制在标签下方，向上滚动时不会重叠覆盖标签 */}
      <div
        style={{
          flex: 1,
          width: "100%",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* 3. 内容平滑滚动 Container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: `${gap}px`,
            width: "100%",
            transform: `translateY(${-scrollY}px)`,
          }}
        >
          {/* 题干内容 */}
          <div style={{ flexShrink: 0 }}>
            <MdRenderer
              content={displayStem}
              fontSize={stemFontSize}
              lineHeight={STEM_LINE_HEIGHT}
              color={THEME.colors.chalkWhite}
              imageHeight={stemImageH}
            />
          </div>

          {/* 选项列表 */}
          {validOptions.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: `${8 * scale}px`,
                marginTop: `${4 * scale}px`,
              }}
            >
              {validOptions.map((opt, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: `${8 * scale}px ${12 * scale}px`,
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: `${6 * scale}px`,
                  }}
                >
                  <MdRenderer
                    content={opt}
                    fontSize={optionFontSize}
                    lineHeight={OPTION_LINE_HEIGHT}
                    color={THEME.colors.chalkWhite}
                    imageHeight={optionImageH}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
