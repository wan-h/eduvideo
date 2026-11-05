import type { FeScene } from "@ask2vid/shared"
import { describe, expect, it } from "vitest"
import { useSceneStore } from "../scene-store"

function makeScene(id: string, segments?: FeScene["segments"]): FeScene {
  return {
    id,
    sceneType: "question_solution",
    segments: segments ?? [
      {
        id: `${id}-seg-1`,
        title: "片段1",
        content: "",
        subtitles: [],
      },
    ],
  }
}

const scenes: FeScene[] = [
  makeScene("scene-1", [
    {
      id: "seg-1",
      title: "片段A",
      content: "",
      subtitles: [{ id: "sub-1", text: "字幕1", audio: "", duration: 1000 }],
    },
  ]),
  makeScene("scene-2"),
]

describe("useSceneStore", () => {
  it("initialize 设置场景列表和默认选中", () => {
    useSceneStore.getState().initialize(scenes)
    const s = useSceneStore.getState()
    expect(s.scenes.length).toBe(2)
    expect(s.activeSceneId).toBe("scene-1")
    expect(s.selectedSegmentId).toBe("seg-1")
  })

  it("setActiveScene 切换场景并重置选中", () => {
    useSceneStore.getState().initialize(scenes)
    useSceneStore.getState().setActiveScene("scene-2")
    const s = useSceneStore.getState()
    expect(s.activeSceneId).toBe("scene-2")
    expect(s.selectedSegmentId).toBe("scene-2-seg-1")
    expect(s.selectedSubtitleId).toBeNull()
  })

  it("setActiveScene 对不存在的场景无操作", () => {
    useSceneStore.getState().initialize(scenes)
    useSceneStore.getState().setActiveScene("nonexistent")
    expect(useSceneStore.getState().activeSceneId).toBe("scene-1")
  })

  it("setSelectedSegment 更新选中片段", () => {
    useSceneStore.getState().initialize(scenes)
    useSceneStore.getState().setSelectedSegment("seg-1")
    expect(useSceneStore.getState().selectedSegmentId).toBe("seg-1")
  })

  it("setSelectedSubtitle 更新选中字幕", () => {
    useSceneStore.getState().initialize(scenes)
    useSceneStore.getState().setSelectedSubtitle("sub-1")
    expect(useSceneStore.getState().selectedSubtitleId).toBe("sub-1")
  })

  it("activeScene 选择器返回当前场景", () => {
    useSceneStore.getState().initialize(scenes)
    const active = useSceneStore
      .getState()
      .scenes.find((s) => s.id === useSceneStore.getState().activeSceneId)
    expect(active?.id).toBe("scene-1")
  })
})
