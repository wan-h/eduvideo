import { useMemo } from "react"
import { spring, useCurrentFrame, useVideoConfig } from "remotion"

import { useResolutionScale } from "../hooks/use-resolution-scale"
import {
  MdRenderer,
  mergeConsecutiveImages,
} from "../markdown/md-renderer"
import { THEME } from "../styles/theme"
import {
  calcMdHeight,
} from "../utils/step-scroll"

export interface IntroProps {
  stem: string
  options: string[]
  /** 本场景在视频中的全局起始帧号 */
  startFrame: number
  /** 本场景的总帧数（用于分段滚动的时间分配） */
  durationInFrames: number
  /** 跳过入场动画，直接以终态渲染（首场景预览优化） */
  skipEntrance?: boolean
}

// ── 1080p 设计基准值 ──

const BASE_STEM_FONT_SIZE = 28
const BASE_OPTION_FONT_SIZE = 30
const STEM_LINE_HEIGHT = 1.6
const OPTION_LINE_HEIGHT = 1.5
const BASE_STEM_H_PADDING = 48 // 24px × 2
const BASE_CONTAINER_GAP = 32
const BASE_IMAGE_HEIGHT = 300
const BASE_PADDING_BOTTOM = 40
const BASE_ENTRY_TRANSLATE = 40
const BASE_OPTION_ENTRY_TRANSLATE = 20
const BASE_PADDING = 24
const BASE_OPTION_PADDING_Y = 28.8
const BASE_OPTION_PADDING_X = 38.4
const BASE_GRID_GAP = 23.04
const BASE_BORDER_RADIUS = 8

// stripMarkdown 抹掉 markdown 格式化（表格/列表/引用边距等），
// 纯文本测量偏低。1.2× 安全系数补偿格式化开销。
const MEASURE_SAFETY_FACTOR = 1.2

/** 用指定字号计算原始内容总高度（不含安全系数） */
function calcContentHeight(
  stemFontSize: number,
  optionFontSize: number,
  stem: string,
  options: string[],
  videoWidth: number,
  containerAvailableH: number,
  scale: number
): number {
  const contentPaddingX = 76.8 * scale
  const contentWidth = videoWidth - contentPaddingX * 2
  const stemTextWidth = contentWidth - BASE_STEM_H_PADDING * scale

  // 题干高度：使用全局精准高度计算（包含 HTML/GFM 表格、图片、块级/行内公式等）
  const stemH = calcMdHeight({
    md: stem,
    fontSize: stemFontSize,
    lineHeight: STEM_LINE_HEIGHT,
    maxWidth: stemTextWidth,
    fontFamily: THEME.fontFamily,
    scale,
  })

  const validOptions = options.filter((o) => o.trim() !== "")
  let optionsH = 0
  if (validOptions.length > 0) {
    const gridGap = videoWidth * 0.012
    const optionColWidth = (contentWidth - gridGap) / 2
    const optionHPadding = videoWidth * 0.02
    const optionTextWidth = optionColWidth - optionHPadding * 2 - 2

    // 计算每个选项卡片的高度
    const cardHeights = validOptions.map(
      (opt) =>
        calcMdHeight({
          md: opt,
          fontSize: optionFontSize,
          lineHeight: OPTION_LINE_HEIGHT,
          maxWidth: optionTextWidth,
          fontFamily: THEME.fontFamily,
          scale,
        }) +
        videoWidth * 0.03 +
        2
    )

    // 行优先布局：每行 2 列，行高 = 该行中最高卡片
    const COLS = 2
    const numRows = Math.ceil(cardHeights.length / COLS)
    for (let row = 0; row < numRows; row++) {
      const rowMax = Math.max(
        ...cardHeights.slice(row * COLS, row * COLS + COLS)
      )
      optionsH += rowMax + (row < numRows - 1 ? gridGap : 0)
    }
  }

  const stemMarginBottom = containerAvailableH * 0.02
  return stemH + stemMarginBottom + BASE_CONTAINER_GAP * scale + optionsH
}

export function Intro({
  stem,
  options,
  startFrame,
  durationInFrames,
  skipEntrance = false,
}: IntroProps) {
  const frame = useCurrentFrame()
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig()
  const scale = useResolutionScale()
  const localFrame = frame - startFrame

  const stemFontSize = BASE_STEM_FONT_SIZE * scale
  const optionFontSize = BASE_OPTION_FONT_SIZE * scale
  const imageHeight = BASE_IMAGE_HEIGHT * scale
  const paddingBottom = BASE_PADDING_BOTTOM * scale
  const entryTranslateYBase = BASE_ENTRY_TRANSLATE * scale
  const optionEntryTranslateYBase = BASE_OPTION_ENTRY_TRANSLATE * scale
  const padding = BASE_PADDING * scale
  const optionPaddingY = BASE_OPTION_PADDING_Y * scale
  const optionPaddingX = BASE_OPTION_PADDING_X * scale
  const gridGap = BASE_GRID_GAP * scale
  const borderRadius = BASE_BORDER_RADIUS * scale

  // 连续图片合并为同一段落：多图横向居中，放不下自动换行
  const displayStem = useMemo(() => mergeConsecutiveImages(stem), [stem])
  const displayOptions = useMemo(
    () => options.map((o) => mergeConsecutiveImages(o)),
    [options]
  )

  // ── 1. 测量内容高度 → 计算滚动 ──
  const { scrollTarget, overflow, containerAvailableH } = useMemo(() => {
    const containerAvailableH = videoHeight * 0.84 - paddingBottom

    const rawTotalH = calcContentHeight(
      stemFontSize,
      optionFontSize,
      displayStem,
      displayOptions,
      videoWidth,
      containerAvailableH,
      scale
    )
    const totalH = rawTotalH * MEASURE_SAFETY_FACTOR

    if (totalH <= containerAvailableH) {
      return {
        scrollTarget: 0,
        overflow: 0,
        containerAvailableH,
      }
    }

    const overflow = Math.max(0, rawTotalH - containerAvailableH)
    return {
      scrollTarget: overflow,
      overflow,
      containerAvailableH,
    }
  }, [
    displayStem,
    displayOptions,
    videoWidth,
    videoHeight,
    stemFontSize,
    optionFontSize,
    scale,
    paddingBottom,
  ])

  // ── 2. 动画 ──

  const boxProgress = skipEntrance
    ? 1
    : spring({
      frame: localFrame,
      fps,
      config: { damping: 20, stiffness: 150 },
    })
  const boxOpacity = skipEntrance ? 1 : Math.min(1, localFrame / 15)

  const scrollY = useMemo(() => {
    if (scrollTarget <= 0 || overflow <= 0 || durationInFrames <= 0) return 0
    const SCROLL_DELAY = 15
    const HOLD_RATIO = 0.55
    const activeFrame = localFrame - SCROLL_DELAY
    if (activeFrame <= 0) return 0

    const stepSize = containerAvailableH * 0.85
    const numSteps = Math.max(1, Math.ceil(scrollTarget / stepSize))
    const effectiveDuration = durationInFrames - SCROLL_DELAY
    const stepDuration = effectiveDuration / numSteps
    const holdDuration = stepDuration * HOLD_RATIO
    const stepScrollAmount = scrollTarget / numSteps

    const stepIndex = Math.min(
      Math.floor(activeFrame / stepDuration),
      numSteps - 1
    )
    const stepElapsed = activeFrame - stepIndex * stepDuration
    const baseScroll = stepIndex * stepScrollAmount

    if (stepElapsed <= holdDuration) return baseScroll
    if (baseScroll >= scrollTarget) return scrollTarget

    const scrollLocalFrame = stepElapsed - holdDuration
    const progress = spring({
      frame: scrollLocalFrame,
      fps,
      config: { damping: 18, stiffness: 120 },
    })

    return Math.min(baseScroll + progress * stepScrollAmount, scrollTarget)
  }, [
    scrollTarget,
    overflow,
    containerAvailableH,
    localFrame,
    fps,
    durationInFrames,
  ])

  const entryTranslateY = (1 - boxProgress) * entryTranslateYBase
  const entryScale = 0.9 + boxProgress * 0.1
  const needsScroll = scrollTarget > 0

  const getOptionProgress = (index: number) => {
    if (skipEntrance) return { opacity: 1, translateY: 0, scale: 1 }
    const optionFrame = localFrame - index * 3
    if (optionFrame < 0)
      return { opacity: 0, translateY: optionEntryTranslateYBase, scale: 0.95 }
    const progress = spring({
      frame: optionFrame,
      fps,
      config: { damping: 20, stiffness: 200 },
    })
    const opacity = Math.min(1, optionFrame / 10) * progress
    return {
      opacity,
      translateY: (1 - progress) * optionEntryTranslateYBase,
      scale: 0.95 + progress * 0.05,
    }
  }

  // ── 3. 渲染 ──
  return (
    <div
      style={{
        height: "100%",
        overflow: needsScroll ? "hidden" : "visible",
        display: "flex",
        flexDirection: "column",
        justifyContent: needsScroll ? "flex-start" : "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          gap: `${BASE_CONTAINER_GAP * scale}px`,
          opacity: boxOpacity,
          transform: needsScroll
            ? `translateY(${entryTranslateY - scrollY}px) scale(${entryScale})`
            : `translateY(${entryTranslateY}px) scale(${entryScale})`,
        }}
      >
        <div
          style={{
            width: "100%",
            padding: `${padding}px`,
            marginBottom: "2%",
          }}
        >
          <MdRenderer
            content={displayStem}
            fontSize={stemFontSize}
            lineHeight={STEM_LINE_HEIGHT}
            color={THEME.colors.chalkWhite}
            imageHeight={imageHeight}
          />
        </div>

        {displayOptions.filter((o) => o.trim() !== "").length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridAutoFlow: "row",
              gap: `${gridGap}px`,
              width: "100%",
            }}
          >
            {displayOptions
              .filter((o) => o.trim() !== "")
              .map((option, index) => {
                const anim = getOptionProgress(index)
                return (
                  <div
                    key={index}
                    style={{
                      padding: `${optionPaddingY}px ${optionPaddingX}px`,
                      borderRadius: `${borderRadius}px`,
                      border: "1px solid rgba(255,255,255,0.2)",
                      opacity: anim.opacity,
                      transform: `translateY(${anim.translateY}px) scale(${anim.scale})`,
                      lineHeight: OPTION_LINE_HEIGHT,
                    }}
                  >
                    <MdRenderer
                      content={option}
                      fontSize={optionFontSize}
                      lineHeight={OPTION_LINE_HEIGHT}
                      color={THEME.colors.chalkWhite}
                      imageHeight={imageHeight}
                    />
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
