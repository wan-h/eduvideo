import type { FeScene } from "@ask2vid/shared"
import { beforeEach, describe, expect, it } from "vitest"
import { useSceneStore } from "../scene-store"
import { useSubtitleStore } from "../subtitle-store"

function makeScene(id: string, segments?: FeScene["segments"]): FeScene {
  return {
    id,
    sceneType: "question_solution",
    segments: segments ?? [
      {
        id: `${id}-seg-1`,
        title: "",
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
      title: "片段",
      content: "",
      subtitles: [
        { id: "sub-1", text: "第一条", audio: "", duration: 1000 },
        { id: "sub-2", text: "第二条", audio: "audio.mp3", duration: 2000 },
      ],
    },
  ]),
]

beforeEach(() => {
  useSceneStore.getState().initialize(scenes)
  useSubtitleStore.getState().setEditingSubtitle(null)
})

describe("useSubtitleStore", () => {
  it("addSubtitle 在指定位置下方添加字幕", () => {
    useSubtitleStore
      .getState()
      .addSubtitle("scene-1", "seg-1", "below", "sub-1")
    const s = useSceneStore.getState()
    expect(s.scenes[0].segments[0].subtitles.length).toBe(3)
    expect(s.scenes[0].segments[0].subtitles[1].text).toBe("")
  })

  it("updateSubtitle 更新文本和音频", () => {
    useSubtitleStore.getState().updateSubtitle("scene-1", "seg-1", "sub-1", {
      text: "更新后",
      audio: "new.mp3",
      duration: 3000,
    })
    const s = useSceneStore.getState()
    const sub = s.scenes[0].segments[0].subtitles.find(
      (sb) => sb.id === "sub-1"
    )
    expect(sub?.text).toBe("更新后")
    expect(sub?.audio).toBe("new.mp3")
    expect(sub?.duration).toBe(3000)
  })

  it("deleteSubtitle 删除字幕", () => {
    useSubtitleStore.getState().deleteSubtitle("scene-1", "seg-1", "sub-1")
    const s = useSceneStore.getState()
    expect(s.scenes[0].segments[0].subtitles.length).toBe(1)
    expect(s.scenes[0].segments[0].subtitles[0].id).toBe("sub-2")
  })

  it("setEditingSubtitle 切换编辑字幕", () => {
    expect(useSubtitleStore.getState().editingSubtitleId).toBeNull()
    useSubtitleStore.getState().setEditingSubtitle("sub-1")
    expect(useSubtitleStore.getState().editingSubtitleId).toBe("sub-1")
  })

  it("不存在的场景 addSubtitle 无操作", () => {
    useSubtitleStore
      .getState()
      .addSubtitle("nonexistent", "seg-1", "below", null)
    expect(
      useSceneStore.getState().scenes[0].segments[0].subtitles.length
    ).toBe(2)
  })
})
