import type { PlayerRef } from "@remotion/player"

import { usePlayerFrameTracker } from "./use-player-frame-tracker"

function findSceneAtFrame(
  frame: number,
  sceneMap: Map<string, number>
): string {
  const entries = Array.from(sceneMap.entries()).sort((a, b) => a[1] - b[1])

  let sceneId = ""
  for (const [id, startFrame] of entries) {
    if (startFrame <= frame) {
      sceneId = id
    } else {
      break
    }
  }

  return sceneId
}

/**
 * 根据播放帧号追踪当前 scene。
 *
 * sceneStartFrameMap 通过 ref 持有，避免 map 变化时 effect
 * 重新订阅并立即用当前帧求值。
 */
export function usePlaybackSceneTracker(
  playerRef: React.RefObject<PlayerRef | null>,
  sceneStartFrameMap: Map<string, number>
): string {
  return usePlayerFrameTracker(
    playerRef,
    sceneStartFrameMap,
    findSceneAtFrame,
    ""
  )
}
