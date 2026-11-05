import type { FeScene, FeSegment } from "@ask2vid/shared"
import { v7 as uuidv7 } from "uuid"
import { create } from "zustand"
import { useSceneStore } from "./scene-store"

// ============================================================
// 常量
// ============================================================

const EMPTY_SEGMENT: Omit<FeSegment, "id"> = {
  title: "",
  content: "",
  subtitles: [],
}

// ============================================================
// 辅助函数
// ============================================================

function findScene(scenes: FeScene[], sceneId: string) {
  return scenes.find((s) => s.id === sceneId)
}

function findSegment(scene: FeScene, segmentId: string) {
  return scene.segments.find((s) => s.id === segmentId)
}

// ============================================================
// 类型
// ============================================================

interface SegmentStoreState {
  isEditingSegment: boolean

  addSegment: (
    sceneId: string,
    position: "above" | "below",
    refSegmentId?: string | null
  ) => void
  updateSegment: (
    sceneId: string,
    segmentId: string,
    patch: Partial<Pick<FeSegment, "title" | "content" | "options">>
  ) => void
  deleteSegment: (sceneId: string, segmentId: string) => void
  setEditingSegment: (editing: boolean) => void
}

// ============================================================
// Store
// ============================================================

export const useSegmentStore = create<SegmentStoreState>()((set) => ({
  isEditingSegment: false,

  addSegment: (sceneId, position, refSegmentId) => {
    const { scenes } = useSceneStore.getState()
    const scene = findScene(scenes, sceneId)
    if (!scene) return
    if (scene.sceneType === "question_introduction") return

    const refIndex = refSegmentId
      ? scene.segments.findIndex((s) => s.id === refSegmentId)
      : -1
    const insertIndex =
      refIndex === -1
        ? position === "above"
          ? 0
          : scene.segments.length
        : position === "above"
          ? refIndex
          : refIndex + 1

    const newSegment: FeSegment = { id: uuidv7(), ...EMPTY_SEGMENT }
    const newSegments = [...scene.segments]
    newSegments.splice(insertIndex, 0, newSegment)

    const newScenes = scenes.map((s) =>
      s.id === sceneId ? { ...s, segments: newSegments } : s
    )
    useSceneStore.getState().setScenes(newScenes)
    useSceneStore.getState().setSelectedSegment(newSegment.id)
  },

  updateSegment: (sceneId, segmentId, patch) => {
    const { scenes } = useSceneStore.getState()
    const scene = findScene(scenes, sceneId)
    if (!scene) return
    const segment = findSegment(scene, segmentId)
    if (!segment) return

    const newSegments = scene.segments.map((seg) => {
      if (seg.id !== segmentId) return seg
      return {
        ...seg,
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.content !== undefined && { content: patch.content }),
        ...(patch.options !== undefined && { options: patch.options }),
      }
    })

    const newScenes = scenes.map((s) =>
      s.id === sceneId ? { ...s, segments: newSegments } : s
    )
    useSceneStore.getState().setScenes(newScenes)
  },

  deleteSegment: (sceneId, segmentId) => {
    const { scenes, selectedSegmentId } = useSceneStore.getState()
    const scene = findScene(scenes, sceneId)
    if (!scene) return
    if (scene.sceneType === "question_introduction") return

    const newSegments = scene.segments.filter((s) => s.id !== segmentId)
    if (newSegments.length === 0) return

    const newScenes = scenes.map((s) =>
      s.id === sceneId ? { ...s, segments: newSegments } : s
    )
    useSceneStore.getState().setScenes(newScenes)

    if (selectedSegmentId === segmentId) {
      useSceneStore.getState().setSelectedSegment(newSegments[0]?.id ?? null)
    }
  },

  setEditingSegment: (editing) => set({ isEditingSegment: editing }),
}))
