import { beforeEach, describe, expect, it } from "vitest"

import { hasDraftDiff, useDraftStore } from "@/store/draft-store"
import {
  DEFAULT_TEMPLATE_CONFIG,
  DEFAULT_TEMPLATE_ID,
  useRenderSettingsStore,
  type TemplateConfigState,
} from "@/store/render-settings-store"

/** 创建一个有片头片尾的模板快照 */
function makeSnapshot(
  overrides?: Partial<TemplateConfigState>
): TemplateConfigState {
  return {
    resolution: "720p",
    background: "default",
    opening_film: "",
    closing_film: "",
    watermark: "",
    fps: 30,
    page_layout: "question_split",
    activeTemplateId: DEFAULT_TEMPLATE_ID,
    lastAppliedTemplateId: DEFAULT_TEMPLATE_ID,
    ...overrides,
  }
}

beforeEach(() => {
  // 重置两个 store
  useRenderSettingsStore
    .getState()
    .applyTemplate(DEFAULT_TEMPLATE_ID, DEFAULT_TEMPLATE_CONFIG)
  useDraftStore.getState().closeDraft()
})

/* ────────── 草稿生命周期 ────────── */

describe("useDraftStore 生命周期", () => {
  it("初始 config 为 null", () => {
    expect(useDraftStore.getState().config).toBeNull()
  })

  it("openDraft 从快照初始化草稿", () => {
    const snap = makeSnapshot({ opening_film: "https://x.com/a.mp4" })
    useDraftStore.getState().openDraft(snap)

    const cfg = useDraftStore.getState().config
    expect(cfg).not.toBeNull()
    expect(cfg!.opening_film).toBe("https://x.com/a.mp4")
    expect(cfg!.activeTemplateId).toBe(DEFAULT_TEMPLATE_ID)
    expect(cfg!.lastAppliedTemplateId).toBe(DEFAULT_TEMPLATE_ID)
  })

  it("openDraft 重复调用忽略（config 已存在时不覆盖）", () => {
    const first = makeSnapshot({ fps: 30 })
    const second = makeSnapshot({ fps: 60 })
    useDraftStore.getState().openDraft(first)
    useDraftStore.getState().openDraft(second)

    expect(useDraftStore.getState().config!.fps).toBe(30)
  })

  it("closeDraft 清空草稿", () => {
    useDraftStore.getState().openDraft(makeSnapshot())
    useDraftStore.getState().closeDraft()

    expect(useDraftStore.getState().config).toBeNull()
  })
})

/* ────────── 模板操作 ────────── */

describe("applyTemplate", () => {
  it("在草稿中切换模板覆盖配置", () => {
    useDraftStore.getState().openDraft(makeSnapshot({ fps: 30 }))
    useDraftStore
      .getState()
      .applyTemplate("tpl-1", { resolution: "1080p", fps: 24 })

    const cfg = useDraftStore.getState().config
    expect(cfg!.activeTemplateId).toBe("tpl-1")
    expect(cfg!.lastAppliedTemplateId).toBe("tpl-1")
    // 传入的字段被覆盖
    expect(cfg!.resolution).toBe("1080p")
    expect(cfg!.fps).toBe(24)
    // 未传入的字段保持原值
    expect(cfg!.opening_film).toBe("")
  })

  it("config 为 null 时 applyTemplate 无操作", () => {
    useDraftStore.getState().applyTemplate("tpl-1", { resolution: "1080p" })

    expect(useDraftStore.getState().config).toBeNull()
  })

  it("支持 partial 设置 —— 只传部分字段", () => {
    useDraftStore.getState().openDraft(makeSnapshot())
    useDraftStore
      .getState()
      .applyTemplate("tpl-2", { opening_film: "https://x.com/b.mp4" })

    const cfg = useDraftStore.getState().config
    expect(cfg!.activeTemplateId).toBe("tpl-2")
    expect(cfg!.opening_film).toBe("https://x.com/b.mp4")
    expect(cfg!.resolution).toBe("720p") // 原值不变
  })

  it("空 config {} 不覆盖任何配置字段", () => {
    useDraftStore.getState().openDraft(makeSnapshot({ fps: 30 }))
    useDraftStore.getState().applyTemplate("tpl-3", {})

    const cfg = useDraftStore.getState().config
    expect(cfg!.activeTemplateId).toBe("tpl-3")
    expect(cfg!.fps).toBe(30) // 原值不变（空 settings 未覆盖）
    expect(cfg!.resolution).toBe("720p")
  })
})

/* ────────── 配置 setter 与脏状态 ────────── */

describe("配置 setter 脱离模板", () => {
  it("修改配置后 activeTemplateId 变为 null", () => {
    useDraftStore.getState().openDraft(makeSnapshot())
    useDraftStore.getState().setResolution("1080p")

    const cfg = useDraftStore.getState().config
    expect(cfg!.activeTemplateId).toBeNull()
    // lastAppliedTemplateId 记下脱离前的模板
    expect(cfg!.lastAppliedTemplateId).toBe(DEFAULT_TEMPLATE_ID)
  })

  it("修改配置后再次切换模板恢复干净状态", () => {
    useDraftStore.getState().openDraft(makeSnapshot())
    // 先修改配置 → 脏
    useDraftStore.getState().setFps(15)
    expect(useDraftStore.getState().config!.activeTemplateId).toBeNull()

    // 切换模板 → 干净
    useDraftStore.getState().applyTemplate("tpl-x", { fps: 24 })
    expect(useDraftStore.getState().config!.activeTemplateId).toBe("tpl-x")
  })

  it("setter 值不变时不触发脏标记", () => {
    useDraftStore.getState().openDraft(makeSnapshot({ fps: 30 }))
    useDraftStore.getState().setFps(30)

    // 值未变，不应脱离模板
    expect(useDraftStore.getState().config!.activeTemplateId).toBe(
      DEFAULT_TEMPLATE_ID
    )
  })

  it("setter 在 config 为 null 时无操作", () => {
    useDraftStore.getState().setFps(60)
    expect(useDraftStore.getState().config).toBeNull()
  })
})

/* ────────── hasDraftDiff ────────── */

describe("hasDraftDiff", () => {
  it("配置和模板 ID 完全相同时返回 false", () => {
    const snap = makeSnapshot()
    expect(hasDraftDiff(snap, snap)).toBe(false)
  })

  it("模板 ID 不同时返回 true", () => {
    const draft = makeSnapshot({ activeTemplateId: "tpl-1" })
    const formal = makeSnapshot({ activeTemplateId: DEFAULT_TEMPLATE_ID })
    expect(hasDraftDiff(draft, formal)).toBe(true)
  })

  it("配置字段不同时返回 true", () => {
    const draft = makeSnapshot({ resolution: "1080p" })
    const formal = makeSnapshot({ resolution: "720p" })
    expect(hasDraftDiff(draft, formal)).toBe(true)
  })

  it("opening_film 不同时返回 true", () => {
    const draft = makeSnapshot({ opening_film: "https://x.com/a.mp4" })
    const formal = makeSnapshot({ opening_film: "" })
    expect(hasDraftDiff(draft, formal)).toBe(true)
  })

  it("仅 lastAppliedTemplateId 不同时不影响 diff", () => {
    const draft = makeSnapshot({ lastAppliedTemplateId: "tpl-old" })
    const formal = makeSnapshot({ lastAppliedTemplateId: DEFAULT_TEMPLATE_ID })
    // lastAppliedTemplateId 不在比较范围内，仅比较 6 个配置字段 + activeTemplateId
    expect(hasDraftDiff(draft, formal)).toBe(false)
  })
})

/* ────────── 桥接：commitFromDraft ────────── */

describe("commitFromDraft 草稿 → 正式 store", () => {
  it("提交后正式 store 配置与草稿一致", () => {
    const draftCfg = makeSnapshot({
      activeTemplateId: "tpl-a",
      lastAppliedTemplateId: "tpl-a",
      opening_film: "https://x.com/intro.mp4",
      resolution: "1080p",
    })
    useRenderSettingsStore.getState().commitFromDraft(draftCfg)

    const s = useRenderSettingsStore.getState()
    expect(s.activeTemplateId).toBe("tpl-a")
    expect(s.opening_film).toBe("https://x.com/intro.mp4")
    expect(s.resolution).toBe("1080p")
    expect(s.lastAppliedTemplateId).toBe("tpl-a")
  })

  it("提交后 speed 不变（commitFromDraft 不覆盖 speed）", () => {
    useRenderSettingsStore.getState().setSpeed(2)
    const draftCfg = makeSnapshot()
    useRenderSettingsStore.getState().commitFromDraft(draftCfg)

    expect(useRenderSettingsStore.getState().speed).toBe(2)
  })

  it("草稿 dirty 状态提交后正式层同步 dirty", () => {
    const draftCfg = makeSnapshot({
      activeTemplateId: null,
      lastAppliedTemplateId: "tpl-old",
      background: "custom-bg",
    })
    useRenderSettingsStore.getState().commitFromDraft(draftCfg)

    const s = useRenderSettingsStore.getState()
    expect(s.activeTemplateId).toBeNull()
    expect(s.lastAppliedTemplateId).toBe("tpl-old")
    expect(s.background).toBe("custom-bg")
  })
})

/* ────────── 端到端：Dialog 交互流 ────────── */

describe("Dialog 交互流（端到端）", () => {
  it("打开 → 切换模板 → 应用 → 正式生效", () => {
    // 1. 打开 dialog：快照正式状态到草稿
    useDraftStore
      .getState()
      .openDraft(makeSnapshot({ activeTemplateId: DEFAULT_TEMPLATE_ID }))

    // 2. 用户切换模板
    useDraftStore.getState().applyTemplate("real-tpl-1", {
      resolution: "1080p",
      opening_film: "https://x.com/intro.mp4",
    })
    expect(useDraftStore.getState().config!.activeTemplateId).toBe("real-tpl-1")

    // 3. 用户点击「应用模板」
    const draft = useDraftStore.getState().config!
    useRenderSettingsStore.getState().commitFromDraft(draft)
    useDraftStore.getState().closeDraft()

    // 4. 验证正式 store
    const s = useRenderSettingsStore.getState()
    expect(s.activeTemplateId).toBe("real-tpl-1")
    expect(s.resolution).toBe("1080p")
    expect(s.opening_film).toBe("https://x.com/intro.mp4")
    expect(useDraftStore.getState().config).toBeNull()
  })

  it("打开 → 编辑配置 → 放弃 → 正式不变", () => {
    const originalFps = useRenderSettingsStore.getState().fps

    // 打开 dialog，修改 fps
    useDraftStore.getState().openDraft(makeSnapshot())
    useDraftStore.getState().setFps(15)

    // 关闭 dialog 放弃
    useDraftStore.getState().closeDraft()

    // 正式 store 不变
    expect(useRenderSettingsStore.getState().fps).toBe(originalFps)
  })

  it("打开 → 无操作 → 应用按钮 disabled（无 diff）", () => {
    const formal = {
      resolution: useRenderSettingsStore.getState().resolution,
      background: useRenderSettingsStore.getState().background,
      opening_film: useRenderSettingsStore.getState().opening_film,
      closing_film: useRenderSettingsStore.getState().closing_film,
      watermark: useRenderSettingsStore.getState().watermark,
      fps: useRenderSettingsStore.getState().fps,
      page_layout: useRenderSettingsStore.getState().page_layout,
      activeTemplateId: useRenderSettingsStore.getState()
        .activeTemplateId as string,
      lastAppliedTemplateId:
        useRenderSettingsStore.getState().lastAppliedTemplateId,
    }
    useDraftStore.getState().openDraft(formal)

    const hasDiff = hasDraftDiff(useDraftStore.getState().config!, formal)
    expect(hasDiff).toBe(false)
  })
})
