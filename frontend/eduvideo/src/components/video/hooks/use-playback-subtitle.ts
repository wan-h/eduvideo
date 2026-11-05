import type { PlayerRef } from "@remotion/player"
import type { SubtitleFrameInfo } from "../utils/scene-frame"

import { usePlayerFrameTracker } from "./use-player-frame-tracker"

export interface PlaybackSubtitleInfo {
  subtitleId: string
  segmentId: string
  sceneId: string
}

function findSubtitleAtFrame(
  frame: number,
  subtitleFrameMap: Map<string, SubtitleFrameInfo>
): PlaybackSubtitleInfo {
  for (const [subtitleId, info] of subtitleFrameMap) {
    if (info.startFrame <= frame && frame < info.endFrame) {
      return {
        subtitleId,
        segmentId: info.segmentId,
        sceneId: info.sceneId,
      }
    }
  }
  return { subtitleId: "", segmentId: "", sceneId: "" }
}

/**
 * 根据播放帧号追踪当前字幕和所属片段。
 *
 * subtitleFrameMap 通过 ref 持有，避免 map 变化时 effect
 * 重新订阅并立即用当前帧求值，导致误切换到旧 segment。
 */
export function usePlaybackSubtitleTracker(
  playerRef: React.RefObject<PlayerRef | null>,
  subtitleFrameMap: Map<string, SubtitleFrameInfo>
): PlaybackSubtitleInfo {
  return usePlayerFrameTracker(
    playerRef,
    subtitleFrameMap,
    findSubtitleAtFrame,
    { subtitleId: "", segmentId: "", sceneId: "" }
  )
}
