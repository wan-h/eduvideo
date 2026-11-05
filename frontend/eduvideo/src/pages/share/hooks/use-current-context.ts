import { computeSubtitleFrameMap } from "@/components/video/utils/scene-frame"
import type { FeScene } from "@ask2vid/shared"
import type { PlayerRef } from "@remotion/player"
import { useCallback, useMemo } from "react"

export function useCurrentContext(
  playerRef: React.RefObject<PlayerRef | null>,
  scenes: FeScene[],
  fps: number
) {
  const subtitleFrameMap = useMemo(
    () => computeSubtitleFrameMap(scenes, fps),
    [scenes, fps]
  )

  // 构建 subtitleId → segment 的快速查找
  const segmentMap = useMemo(() => {
    const map = new Map<string, { content: string }>()
    for (const scene of scenes) {
      for (const segment of scene.segments) {
        for (const subtitle of segment.subtitles) {
          map.set(subtitle.id, { content: segment.content })
        }
      }
    }
    return map
  }, [scenes])

  // 构建 subtitleId → subtitle text 的快速查找
  const subtitleTextMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const scene of scenes) {
      for (const segment of scene.segments) {
        for (const subtitle of segment.subtitles) {
          map.set(subtitle.id, subtitle.text)
        }
      }
    }
    return map
  }, [scenes])

  const getCurrentContext = useCallback(() => {
    const frame = playerRef.current?.getCurrentFrame()
    if (frame == null) return null

    // 查找当前帧对应的 subtitle
    for (const [subtitleId, info] of subtitleFrameMap) {
      if (frame >= info.startFrame && frame < info.endFrame) {
        const seg = segmentMap.get(subtitleId)
        const explanation = subtitleTextMap.get(subtitleId) ?? ""
        return {
          current_teacher_handout: seg?.content ?? "",
          current_teacher_explanation: explanation,
        }
      }
    }
    return null
  }, [playerRef, subtitleFrameMap, segmentMap, subtitleTextMap])

  return { getCurrentContext }
}
