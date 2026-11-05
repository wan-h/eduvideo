import type { FeScene } from "@ask2vid/shared"
import { beforeEach, describe, expect, it } from "vitest"
import { useSceneStore } from "../scene-store"
import { useSegmentStore } from "../segment-store"

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
      content: "内容A",
      subtitles: [],
    },
    {
      id: "seg-2",
      title: "片段B",
      content: "内容B",
      subtitles: [],
    },
  ]),
]

beforeEach(() => {
  useSceneStore.getState().initialize(scenes)
  useSegmentStore.getState().setEditingSegment(false)
})

describe("useSegmentStore", () => {
  it("addSegment 在指定位置下方添加片段", () => {
    useSegmentStore.getState().addSegment("scene-1", "below", "seg-1")
    const s = useSceneStore.getState()
    expect(s.scenes[0].segments.length).toBe(3)
    expect(s.scenes[0].segments[1].title).toBe("")
  })

  it("addSegment 在指定位置上方添加片段", () => {
    useSegmentStore.getState().addSegment("scene-1", "above", "seg-2")
    const s = useSceneStore.getState()
    expect(s.scenes[0].segments.length).toBe(3)
    expect(s.scenes[0].segments[1].title).toBe("")
    expect(s.scenes[0].segments[2].id).toBe("seg-2")
  })

  it("updateSegment 更新标题和内容", () => {
    useSegmentStore.getState().updateSegment("scene-1", "seg-1", {
      title: "新标题",
      content: "新内容",
    })
    const s = useSceneStore.getState()
    const seg = s.scenes[0].segments.find((sg) => sg.id === "seg-1")
    expect(seg?.title).toBe("新标题")
    expect(seg?.content).toBe("新内容")
  })

  it("deleteSegment 删除片段", () => {
    useSegmentStore.getState().deleteSegment("scene-1", "seg-2")
    const s = useSceneStore.getState()
    expect(s.scenes[0].segments.length).toBe(1)
    expect(s.scenes[0].segments[0].id).toBe("seg-1")
  })

  it("deleteSegment 至少保留一个片段时不删除", () => {
    // 先删到只剩一个
    useSegmentStore.getState().deleteSegment("scene-1", "seg-2")
    // 再尝试删除最后一个
    useSegmentStore.getState().deleteSegment("scene-1", "seg-1")
    expect(useSceneStore.getState().scenes[0].segments.length).toBe(1)
  })

  it("setEditingSegment 切换编辑状态", () => {
    expect(useSegmentStore.getState().isEditingSegment).toBe(false)
    useSegmentStore.getState().setEditingSegment(true)
    expect(useSegmentStore.getState().isEditingSegment).toBe(true)
  })

  it("不存在的场景 addSegment 无操作", () => {
    useSegmentStore.getState().addSegment("nonexistent", "below", null)
    expect(useSceneStore.getState().scenes[0].segments.length).toBe(2)
  })
})
