import { useMemo } from "react"
import { spring } from "remotion"

import { calcStepOffsets, calcTargetScroll } from "../utils/step-scroll"

// ── 类型 ──

export interface UseStepScrollParams {
  /** 每个步骤的估算高度 */
  stepHeights: number[]
  /** 步骤间间距 */
  stepGap: number
  /** 当前活跃步骤索引，-1 表示尚无步骤开始 */
  currentIndex: number
  /** 可视区域净高度（已扣除 padding） */
  visibleHeight: number
  /** 顶部留白，超大步骤顶部对齐时使用 */
  topPadding: number
  /** 当前场景的本地帧号 */
  localFrame: number
  /** 视频帧率 */
  fps: number
  /** 当前步骤的起始帧号 */
  stepStartFrame: number
  /** Spring 动画配置，默认 { stiffness: 80, damping: 16 } */
  springConfig?: { stiffness: number; damping: number }
}

// ── 默认值 ──

const DEFAULT_SPRING = { stiffness: 80, damping: 16 }

// ── Hook ──

/**
 * 步骤累加滚动 hook。
 * 当步骤累积高度超过可视区域时，滚动使当前步骤底部对齐视口下边界；
 * 单步骤超高时改为顶部对齐。
 */
export function useStepScroll(params: UseStepScrollParams): number {
  const {
    stepHeights,
    stepGap,
    currentIndex,
    visibleHeight,
    topPadding,
    localFrame,
    fps,
    stepStartFrame,
    springConfig = DEFAULT_SPRING,
  } = params

  return useMemo(() => {
    const isMeasured = stepHeights.length > 0 && stepHeights.every((h) => h > 0)

    if (currentIndex < 0 || !isMeasured) return 0

    const offsets = calcStepOffsets(stepHeights, stepGap)

    // 前一步骤的目标滚动量
    const fromScroll =
      currentIndex > 0
        ? calcTargetScroll({
            offset: offsets[currentIndex - 1],
            height: stepHeights[currentIndex - 1],
            visibleHeight,
            topPadding,
          })
        : 0

    // 当前步骤的目标滚动量
    const toScroll = calcTargetScroll({
      offset: offsets[currentIndex],
      height: stepHeights[currentIndex],
      visibleHeight,
      topPadding,
    })

    // 保证单调递增：滚动只增不减
    const clampedToScroll = Math.max(toScroll, fromScroll)
    const diff = clampedToScroll - fromScroll

    if (diff <= 0) return fromScroll

    const progress = spring({
      frame: localFrame - stepStartFrame,
      fps,
      config: springConfig,
    })

    return fromScroll + diff * Math.min(1, Math.max(0, progress))
  }, [
    stepHeights,
    stepGap,
    currentIndex,
    visibleHeight,
    topPadding,
    localFrame,
    fps,
    stepStartFrame,
    springConfig,
  ])
}
