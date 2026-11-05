import type { FeScene, FeSubtitle } from "@ask2vid/shared"
import { v7 as uuidv7 } from "uuid"
import { create } from "zustand"
import { useSceneStore } from "./scene-store"

// ============================================================
// 常量
// ============================================================

const EMPTY_SUBTITLE: Omit<FeSubtitle, "id"> = {
  text: "",
  audio: "",
  duration: 0,
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

interface SubtitleStoreState {
  editingSubtitleId: string | null

  addSubtitle: (
    sceneId: string,
    segmentId: string,
    position: "above" | "below",
    refSubtitleId?: string | null
  ) => void
  updateSubtitle: (
    sceneId: string,
    segmentId: string,
    subtitleId: string,
    patch: Partial<Pick<FeSubtitle, "text" | "audio" | "duration">>
  ) => void
  deleteSubtitle: (
    sceneId: string,
    segmentId: string,
    subtitleId: string
  ) => void
  setEditingSubtitle: (subtitleId: string | null) => void
}

// ============================================================
// Store
// ============================================================

export const useSubtitleStore = create<SubtitleStoreState>()((set) => ({
  editingSubtitleId: null,

  addSubtitle: (sceneId, segmentId, position, refSubtitleId) => {
    const { scenes } = useSceneStore.getState()
    const scene = findScene(scenes, sceneId)
    if (!scene) return
    const segment = findSegment(scene, segmentId)
    if (!segment) return

    const refIndex = refSubtitleId
      ? segment.subtitles.findIndex((s) => s.id === refSubtitleId)
      : -1
    const insertIndex =
      refIndex === -1
        ? position === "above"
          ? 0
          : segment.subtitles.length
        : position === "above"
          ? refIndex
          : refIndex + 1

    const newSubtitle: FeSubtitle = { id: uuidv7(), ...EMPTY_SUBTITLE }
    const newSubtitles = [...segment.subtitles]
    newSubtitles.splice(insertIndex, 0, newSubtitle)

    const newSegments = scene.segments.map((seg) =>
      seg.id === segmentId ? { ...seg, subtitles: newSubtitles } : seg
    )
    const newScenes = scenes.map((s) =>
      s.id === sceneId ? { ...s, segments: newSegments } : s
    )
    useSceneStore.getState().setScenes(newScenes)
  },

  updateSubtitle: (sceneId, segmentId, subtitleId, patch) => {
    const { scenes } = useSceneStore.getState()
    const scene = findScene(scenes, sceneId)
    if (!scene) return
    const segment = findSegment(scene, segmentId)
    if (!segment) return
    const subtitle = segment.subtitles.find((s) => s.id === subtitleId)
    if (!subtitle) return

    const newSubtitles = segment.subtitles.map((sub) => {
      if (sub.id !== subtitleId) return sub
      return {
        ...sub,
        ...(patch.text !== undefined && { text: patch.text }),
        ...(patch.audio !== undefined && { audio: patch.audio }),
        ...(patch.duration !== undefined && { duration: patch.duration }),
      }
    })

    const newSegments = scene.segments.map((seg) =>
      seg.id === segmentId ? { ...seg, subtitles: newSubtitles } : seg
    )
    const newScenes = scenes.map((s) =>
      s.id === sceneId ? { ...s, segments: newSegments } : s
    )
    useSceneStore.getState().setScenes(newScenes)
  },

  deleteSubtitle: (sceneId, segmentId, subtitleId) => {
    const { scenes } = useSceneStore.getState()
    const scene = findScene(scenes, sceneId)
    if (!scene) return
    const segment = findSegment(scene, segmentId)
    if (!segment) return

    const newSubtitles = segment.subtitles.filter((s) => s.id !== subtitleId)
    if (newSubtitles.length === segment.subtitles.length) return

    const newSegments = scene.segments.map((seg) =>
      seg.id === segmentId ? { ...seg, subtitles: newSubtitles } : seg
    )
    const newScenes = scenes.map((s) =>
      s.id === sceneId ? { ...s, segments: newSegments } : s
    )
    useSceneStore.getState().setScenes(newScenes)
  },

  setEditingSubtitle: (subtitleId) => set({ editingSubtitleId: subtitleId }),
}))
