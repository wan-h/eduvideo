import type { FeScene } from "@ask2vid/shared"
import { create } from "zustand"
import { useSegmentStore } from "./segment-store"
import { useSubtitleStore } from "./subtitle-store"

interface SceneStoreState {
  scenes: FeScene[]
  activeSceneId: string
  selectedSegmentId: string | null
  selectedSubtitleId: string | null

  initialize: (scenes: FeScene[]) => void
  reset: () => void
  setActiveScene: (sceneId: string) => void
  setSelectedSegment: (segmentId: string | null) => void
  setSelectedSubtitle: (subtitleId: string | null) => void

  /** 替换整个 scenes 数组，供 segment/subtitle store 调用 */
  setScenes: (scenes: FeScene[]) => void
}

function findScene(scenes: FeScene[], sceneId: string) {
  return scenes.find((s) => s.id === sceneId)
}

export const useSceneStore = create<SceneStoreState>()((set) => ({
  scenes: [],
  activeSceneId: "",
  selectedSegmentId: null,
  selectedSubtitleId: null,

  initialize: (scenes) =>
    set({
      scenes,
      activeSceneId: scenes[0]?.id ?? "",
      selectedSegmentId: scenes[0]?.segments[0]?.id ?? null,
    }),

  reset: () =>
    set({
      scenes: [],
      activeSceneId: "",
      selectedSegmentId: null,
      selectedSubtitleId: null,
    }),

  setActiveScene: (sceneId) => {
    const scene = findScene(useSceneStore.getState().scenes, sceneId)
    if (!scene) return
    set({
      activeSceneId: sceneId,
      selectedSegmentId: scene.segments[0]?.id ?? null,
      selectedSubtitleId: null,
    })
    useSegmentStore.getState().setEditingSegment(false)
    useSubtitleStore.getState().setEditingSubtitle(null)
  },

  setSelectedSegment: (segmentId) => set({ selectedSegmentId: segmentId }),

  setSelectedSubtitle: (subtitleId) => set({ selectedSubtitleId: subtitleId }),

  setScenes: (scenes) => set({ scenes }),
}))
