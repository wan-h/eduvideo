import type { FeScene } from "@ask2vid/shared"

export interface SceneFrameData {
  /** 每个场景的持续时长（毫秒） */
  sceneDurations: number[]
  /** 总帧数 */
  totalDurationInFrames: number
  /** 每个场景的起始帧号 */
  sceneStartFrames: number[]
  /** 每个场景的帧区间 [start, end) */
  sceneFrameRanges: [number, number][]
}

/** 根据场景和帧率统一计算帧数据，保证与 Remotion Sequence 定位一致 */
export function computeSceneFrameData(
  scenes: FeScene[],
  fps: number
): SceneFrameData {
  const sceneDurations = scenes.map((scene) =>
    scene.segments
      .flatMap((seg) => seg.subtitles)
      .reduce((sum, sub) => sum + sub.duration, 0)
  )
  const totalMs = sceneDurations.reduce((a, b) => a + b, 0)

  if (totalMs === 0) {
    return {
      sceneDurations,
      totalDurationInFrames: 0,
      sceneStartFrames: scenes.map(() => 0),
      sceneFrameRanges: [] as [number, number][],
    }
  }

  const totalFrames = Math.ceil((totalMs / 1000) * fps)

  let accumulatedMs = 0
  const sceneStartFrames: number[] = sceneDurations.map((d) => {
    const start = Math.floor((accumulatedMs / 1000) * fps)
    accumulatedMs += d
    return start
  })

  const sceneFrameRanges: [number, number][] = sceneStartFrames.map(
    (start, i) => {
      const end =
        i < sceneStartFrames.length - 1 ? sceneStartFrames[i + 1] : totalFrames
      return [start, end]
    }
  )

  return {
    sceneDurations,
    totalDurationInFrames: totalFrames,
    sceneStartFrames,
    sceneFrameRanges,
  }
}

/** 单条字幕在视频中的绝对帧区间和归属信息 */
export interface SubtitleFrameInfo {
  startFrame: number
  endFrame: number
  segmentId: string
  sceneId: string
}

/**
 * 计算每条字幕在视频中的绝对帧区间。
 * 遍历顺序与 computeSceneFrameData 一致（scene → segment → subtitle），
 * 确保帧定位与 Remotion Sequence 渲染完全对应。
 */
export function computeSubtitleFrameMap(
  scenes: FeScene[],
  fps: number
): Map<string, SubtitleFrameInfo> {
  const map = new Map<string, SubtitleFrameInfo>()
  let accumulatedMs = 0
  let lastSubtitleId: string | null = null

  for (const scene of scenes) {
    for (const segment of scene.segments) {
      for (const subtitle of segment.subtitles) {
        if (subtitle.duration === 0) continue

        const startFrame = Math.floor((accumulatedMs / 1000) * fps)
        accumulatedMs += subtitle.duration
        const endFrame = Math.floor((accumulatedMs / 1000) * fps)

        map.set(subtitle.id, {
          startFrame,
          endFrame,
          segmentId: segment.id,
          sceneId: scene.id,
        })
        lastSubtitleId = subtitle.id
      }
    }
  }

  // 确保最后一条字幕的 endFrame 与 computeSceneFrameData 的 totalFrames 一致
  // computeSceneFrameData 使用 Math.ceil 计算总帧数，而此处循环内使用 Math.floor，
  // 当总时长不是帧间隔的整数倍时，最后一条字幕的 endFrame 会少 0-1 帧
  if (accumulatedMs > 0 && lastSubtitleId !== null) {
    const totalFrames = Math.ceil((accumulatedMs / 1000) * fps)
    const lastInfo = map.get(lastSubtitleId)
    if (lastInfo) {
      lastInfo.endFrame = totalFrames
    }
  }

  return map
}
