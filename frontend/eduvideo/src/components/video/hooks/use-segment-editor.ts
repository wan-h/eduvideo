import type { PlayerRef } from "@remotion/player"

import type { FeSegment } from "@ask2vid/shared"
import { COMPOSITION_DEFAULTS, resolveDimension } from "@ask2vid/shared"

import { useSceneStore } from "../store/scene-store"
import { useSegmentStore } from "../store/segment-store"
import type { SubtitleFrameInfo } from "../utils/scene-frame"

/** 编辑弹窗目标（含 sceneId，由 EditorLeft 共享管理） */
export interface EditTarget {
  sceneId: string
  segmentId: string
  title: string
  content: string
  options?: string[]
}

/** 删除确认目标（含 sceneId，由 EditorLeft 共享管理） */
export interface DeleteTarget {
  sceneId: string
  segmentId: string
}

/**
 * 片段编辑器 hook — 绑定到指定 scene，返回该 scene 的 segment 列表及操作。
 * 编辑/删除弹窗状态由上层 EditorLeft 统一管理。
 */
export function useSegmentEditor(
  sceneId: string,
  playerRef: React.RefObject<PlayerRef | null>,
  subtitleFrameMap: Map<string, SubtitleFrameInfo>
) {
  const scenes = useSceneStore((s) => s.scenes)
  const selectedSegmentId = useSceneStore((s) => s.selectedSegmentId)
  const setSelectedSegment = useSceneStore((s) => s.setSelectedSegment)
  const addSegment = useSegmentStore((s) => s.addSegment)

  const scene = scenes.find((s) => s.id === sceneId)
  const segments = scene?.segments ?? []
  const sceneType = scene?.sceneType

  const aspectRatio = (() => {
    const dim = resolveDimension(COMPOSITION_DEFAULTS.resolution)
    return dim.width / dim.height
  })()

  const handleCardClick = (segment: FeSegment) => {
    setSelectedSegment(segment.id)

    const firstSubtitle = segment.subtitles[0]
    if (!firstSubtitle) return

    const frameInfo = subtitleFrameMap.get(firstSubtitle.id)
    if (!frameInfo) return

    const midFrame = Math.floor((frameInfo.startFrame + frameInfo.endFrame) / 2)
    const wasPlaying = playerRef.current?.isPlaying() ?? false
    playerRef.current?.pause()
    playerRef.current?.seekTo(midFrame)
    if (wasPlaying) {
      playerRef.current?.play()
    }
  }

  const handleAddAboveFirst = () => {
    if (!scene || segments.length === 0) return
    addSegment(scene.id, "above", segments[0].id)
  }

  const handleAddBetween = (index: number) => {
    if (!scene) return
    addSegment(scene.id, "below", segments[index].id)
  }

  const handleAddBelowLast = () => {
    if (!scene || segments.length === 0) return
    addSegment(scene.id, "below", segments[segments.length - 1].id)
  }

  const handleAddFirst = () => {
    if (!scene) return
    addSegment(scene.id, "below", null)
  }

  return {
    scene,
    segments,
    sceneType,
    aspectRatio,
    selectedSegmentId,
    handleCardClick,
    handleAddAboveFirst,
    handleAddBetween,
    handleAddBelowLast,
    handleAddFirst,
  }
}
