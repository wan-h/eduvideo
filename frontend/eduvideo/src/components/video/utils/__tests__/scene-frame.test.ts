import type { FeScene, SceneType } from "@ask2vid/shared"
import { describe, expect, it } from "vitest"
import { computeSceneFrameData, computeSubtitleFrameMap } from "../scene-frame"

const DEFAULT_SCENE_TYPE: SceneType = "question_solution"

function makeScene(
  id: string,
  segments: Array<{
    id: string
    subtitles: Array<{ id: string; duration: number }>
  }>
): FeScene {
  return {
    id,
    sceneType: DEFAULT_SCENE_TYPE,
    segments: segments.map((seg) => ({
      id: seg.id,
      title: "",
      content: "",
      subtitles: seg.subtitles.map((sub) => ({
        id: sub.id,
        text: "",
        audio: "",
        duration: sub.duration,
      })),
    })),
  }
}

describe("computeSubtitleFrameMap", () => {
  it("空场景返回空 Map", () => {
    const map = computeSubtitleFrameMap([], 30)
    expect(map.size).toBe(0)
  })

  it("单条字幕 — fps=30, duration=1000ms → 帧区间 [0, 30)", () => {
    const scene = makeScene("s1", [
      { id: "seg1", subtitles: [{ id: "sub1", duration: 1000 }] },
    ])
    const map = computeSubtitleFrameMap([scene], 30)
    const info = map.get("sub1")!
    expect(info.startFrame).toBe(0)
    expect(info.endFrame).toBe(30)
    expect(info.segmentId).toBe("seg1")
    expect(info.sceneId).toBe("s1")
  })

  it("两条相邻字幕 — 帧区间连续不重叠", () => {
    const scene = makeScene("s1", [
      {
        id: "seg1",
        subtitles: [
          { id: "sub1", duration: 1000 },
          { id: "sub2", duration: 500 },
        ],
      },
    ])
    const map = computeSubtitleFrameMap([scene], 30)
    expect(map.get("sub1")!.startFrame).toBe(0)
    expect(map.get("sub1")!.endFrame).toBe(30)
    expect(map.get("sub2")!.startFrame).toBe(30)
    expect(map.get("sub2")!.endFrame).toBe(45)
  })

  it("跨 segment 字幕 — 帧区间连续", () => {
    const scene = makeScene("s1", [
      { id: "seg1", subtitles: [{ id: "sub1", duration: 1000 }] },
      { id: "seg2", subtitles: [{ id: "sub2", duration: 2000 }] },
    ])
    const map = computeSubtitleFrameMap([scene], 30)
    expect(map.get("sub1")!.endFrame).toBe(30)
    expect(map.get("sub2")!.startFrame).toBe(30)
    expect(map.get("sub2")!.endFrame).toBe(90)
  })

  it("跨 scene 字幕 — 帧区间连续", () => {
    const s1 = makeScene("scene1", [
      { id: "seg1", subtitles: [{ id: "sub1", duration: 1000 }] },
    ])
    const s2 = makeScene("scene2", [
      { id: "seg2", subtitles: [{ id: "sub2", duration: 500 }] },
    ])
    const map = computeSubtitleFrameMap([s1, s2], 30)
    expect(map.get("sub1")!.endFrame).toBe(30)
    expect(map.get("sub2")!.startFrame).toBe(30)
    expect(map.get("sub2")!.endFrame).toBe(45)
  })

  it("最后一条字幕的 endFrame 与 computeSceneFrameData 总帧数一致", () => {
    const scene = makeScene("s1", [
      {
        id: "seg1",
        subtitles: [
          { id: "sub1", duration: 700 },
          { id: "sub2", duration: 333 },
        ],
      },
    ])
    const scenes = [scene]
    const map = computeSubtitleFrameMap(scenes, 30)
    const frameData = computeSceneFrameData(scenes, 30)
    const lastSub = map.get("sub2")!
    expect(lastSub.endFrame).toBe(frameData.totalDurationInFrames)
  })

  it("duration=0 的字幕不加入帧映射（不占帧，避免 seek 时误匹配相邻字幕）", () => {
    const scene = makeScene("s1", [
      { id: "seg1", subtitles: [{ id: "sub1", duration: 0 }] },
    ])
    const map = computeSubtitleFrameMap([scene], 30)
    expect(map.size).toBe(0)
    expect(map.get("sub1")).toBeUndefined()
  })
})
