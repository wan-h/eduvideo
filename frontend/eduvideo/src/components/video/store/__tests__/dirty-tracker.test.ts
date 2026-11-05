import { describe, expect, it } from "vitest"
import { type DirtyTrackerState, useDirtyTracker } from "../dirty-tracker"
import { useSceneStore } from "../scene-store"
import { useSegmentStore } from "../segment-store"

interface TestData {
  name: string
  count: number
  nested: { value: string }
}

function makeData(overrides?: Partial<TestData>): TestData {
  return { name: "test", count: 0, nested: { value: "a" }, ...overrides }
}

describe("useDirtyTracker", () => {
  it("未初始化时 isDirty 返回 false", () => {
    const store = useDirtyTracker.getState()
    expect(store.isDirty(makeData())).toBe(false)
  })

  it("初始化后 isDirty 返回 false", () => {
    const store = useDirtyTracker.getState()
    store.initialize(makeData())
    expect(store.isDirty(makeData())).toBe(false)
  })

  it("数据变更后 isDirty 返回 true", () => {
    const store = useDirtyTracker.getState()
    store.initialize(makeData({ count: 0 }))
    expect(store.isDirty(makeData({ count: 1 }))).toBe(true)
  })

  it("相同数据 isDirty 返回 false", () => {
    const store = useDirtyTracker.getState()
    store.initialize(makeData())
    expect(store.isDirty(makeData())).toBe(false)
  })

  it("markClean 后 isDirty 返回 false", () => {
    const store = useDirtyTracker.getState()
    store.initialize(makeData({ count: 0 }))
    store.markClean(makeData({ count: 5 }))
    expect(store.isDirty(makeData({ count: 5 }))).toBe(false)
  })

  it("reset 返回 clean 快照数据", () => {
    const store = useDirtyTracker.getState() as DirtyTrackerState<TestData>
    store.initialize(makeData({ count: 0 }))
    const restored = store.reset()
    expect(restored?.count).toBe(0)
  })

  it("skipDirtyTracking 更新 clean 快照不标记为脏", () => {
    const store = useDirtyTracker.getState()
    store.initialize(makeData({ count: 0 }))
    store.skipDirtyTracking(makeData({ count: 42 }))
    expect(store.isDirty(makeData({ count: 42 }))).toBe(false)
  })

  it("嵌套对象变更被检测", () => {
    const store = useDirtyTracker.getState()
    store.initialize(makeData({ nested: { value: "a" } }))
    expect(store.isDirty(makeData({ nested: { value: "b" } }))).toBe(true)
  })

  it("reset 后 sceneStore 同步回干净数据", () => {
    // 初始化 sceneStore 和 dirtyTracker
    const scenes = [
      {
        id: "s1",
        sceneType: "question_solution" as const,
        segments: [
          {
            id: "seg-1",
            title: "原始标题",
            content: "原始内容",
            subtitles: [],
          },
        ],
      },
    ]
    useSceneStore.getState().initialize(scenes)
    useDirtyTracker.getState().initialize({ scenes })

    // 模拟编辑：通过 segmentStore 修改数据
    useSegmentStore.getState().updateSegment("s1", "seg-1", {
      title: "修改后的标题",
    })

    // 修改后 sceneStore 数据变了
    expect(useSceneStore.getState().scenes[0].segments[0].title).toBe(
      "修改后的标题"
    )

    // 重置：模拟 videoStore.reset() 的行为
    const cleanData = useDirtyTracker.getState().reset() as {
      scenes: typeof scenes
    } | null
    if (cleanData) {
      useSceneStore.getState().setScenes(cleanData.scenes)
    }

    // sceneStore 恢复到原始数据
    expect(useSceneStore.getState().scenes[0].segments[0].title).toBe(
      "原始标题"
    )
  })
})
