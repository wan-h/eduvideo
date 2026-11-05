import { useMemo } from "react"

import type { FeScene } from "../utils/schemas"

// ============================================================
// 类型定义
// ============================================================

/** 字幕帧位置项 */
export interface SubtitleItem {
  start: number
  end: number
  text: string
  audio: string
  sceneIndex: number
  segmentIndex: number
}

/** 活跃场景信息 */
export interface ActiveSceneInfo {
  scene: FeScene
  segmentIndex: number
  /** 当前场景的全局起始帧号 */
  sceneStartFrame: number
  /** 当前场景的全局结束帧号 */
  sceneEndFrame: number
}

/** useSceneTimeline 返回值 */
export interface SceneTimeline {
  subtitleItems: SubtitleItem[]
  totalFrames: number
  getActiveScene: (frame: number) => ActiveSceneInfo | null
}

// ============================================================
// 工具函数
// ============================================================

/** 毫秒转帧数 */
function msToFrame(ms: number, fps: number): number {
  return Math.floor((ms / 1000) * fps)
}

// ============================================================
// 核心 hook
// ============================================================

export function useSceneTimeline(
  scenes: FeScene[],
  fps: number
): SceneTimeline {
  // 扁平化所有字幕为带帧位置的数组
  const subtitleItems = useMemo<SubtitleItem[]>(() => {
    const items: SubtitleItem[] = []
    let accumulatedMs = 0

    for (let si = 0; si < scenes.length; si++) {
      const scene = scenes[si]
      for (let gi = 0; gi < scene.segments.length; gi++) {
        const segment = scene.segments[gi]
        for (const sub of segment.subtitles) {
          const start = msToFrame(accumulatedMs, fps)
          accumulatedMs += sub.duration
          const end = msToFrame(accumulatedMs, fps)

          items.push({
            start,
            end,
            text: sub.text,
            audio: sub.audio,
            sceneIndex: si,
            segmentIndex: gi,
          })
        }
      }
    }

    return items
  }, [scenes, fps])

  // 计算总帧数
  const totalFrames = useMemo(() => {
    if (subtitleItems.length === 0) return 0
    return subtitleItems[subtitleItems.length - 1].end
  }, [subtitleItems])

  // 根据帧号查找当前活跃场景和 segment
  const getActiveScene = useMemo(() => {
    return (frame: number): ActiveSceneInfo | null => {
      const item = subtitleItems.find((s) => frame >= s.start && frame <= s.end)
      if (!item) return null

      // 找到该场景的第一条字幕，取其 start 作为场景起始帧
      const sceneSubtitles = subtitleItems.filter(
        (i) => i.sceneIndex === item.sceneIndex
      )
      const sceneStartFrame = sceneSubtitles[0]?.start ?? 0
      const sceneEndFrame =
        sceneSubtitles.length > 0
          ? Math.max(...sceneSubtitles.map((i) => i.end))
          : 0

      return {
        scene: scenes[item.sceneIndex],
        segmentIndex: item.segmentIndex,
        sceneStartFrame,
        sceneEndFrame,
      }
    }
  }, [subtitleItems, scenes])

  return { subtitleItems, totalFrames, getActiveScene }
}
