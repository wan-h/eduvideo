import { describe, expect, it, beforeEach } from "vitest"
import type { TemplateConfigState, VideoConfigFields } from "../render-settings-store"
import {
  useRenderSettingsStore,
  DEFAULT_TEMPLATE_ID,
  markDirtyFromTemplate,
  getDirtyFields,
  toVideoExportDesc,
  toConfigFields,
} from "../render-settings-store"

describe("renderSettingsStore", () => {
  beforeEach(() => {
    useRenderSettingsStore.setState({
      resolution: "1080p",
      background: "default",
      opening_film: "",
      closing_film: "",
      watermark: "",
      fps: 30,
      speed: 1,
      page_layout: "question_split",
      activeTemplateId: DEFAULT_TEMPLATE_ID,
      lastAppliedTemplateId: DEFAULT_TEMPLATE_ID,
    })
  })

  it("markDirtyFromTemplate should unset activeTemplateId and store lastAppliedTemplateId", () => {
    const draft = { activeTemplateId: "tpl_1", lastAppliedTemplateId: "tpl_0" }
    markDirtyFromTemplate(draft)
    expect(draft.activeTemplateId).toBeNull()
    expect(draft.lastAppliedTemplateId).toBe("tpl_1")
  })

  it("getDirtyFields should compare fields against templateConfig", () => {
    const current: VideoConfigFields = {
      resolution: "720p",
      background: "blackboard2",
      opening_film: "",
      closing_film: "",
      watermark: "",
      fps: 30,
      page_layout: "question_split",
    }
    const template: VideoConfigFields = {
      resolution: "1080p",
      background: "blackboard2",
      opening_film: "",
      closing_film: "",
      watermark: "",
      fps: 30,
      page_layout: "question_split",
    }

    const dirty = getDirtyFields(current, template)
    expect(dirty).toEqual(["resolution"])
  })

  it("should set resolution and mark template dirty", () => {
    useRenderSettingsStore.getState().applyTemplate("tpl_123", { resolution: "1080p" })
    expect(useRenderSettingsStore.getState().activeTemplateId).toBe("tpl_123")

    useRenderSettingsStore.getState().setResolution("720p")
    const state = useRenderSettingsStore.getState()
    expect(state.resolution).toBe("720p")
    expect(state.activeTemplateId).toBeNull()
    expect(state.lastAppliedTemplateId).toBe("tpl_123")
  })

  it("should set background, watermark, opening_film, closing_film, fps, page_layout and speed", () => {
    const store = useRenderSettingsStore.getState()
    store.setBackground("gray")
    store.setWatermark("my_watermark")
    store.setOpeningFilm("http://open.mp4")
    store.setClosingFilm("http://close.mp4")
    store.setFps(60)
    store.setPageLayout("full_screen")
    store.setSpeed(1.5)

    const updated = useRenderSettingsStore.getState()
    expect(updated.background).toBe("gray")
    expect(updated.watermark).toBe("my_watermark")
    expect(updated.opening_film).toBe("http://open.mp4")
    expect(updated.closing_film).toBe("http://close.mp4")
    expect(updated.fps).toBe(60)
    expect(updated.page_layout).toBe("full_screen")
    expect(updated.speed).toBe(1.5)
  })

  it("should commit state from draft", () => {
    const draftConfig: TemplateConfigState = {
      resolution: "2K",
      background: "custom_bg",
      opening_film: "open.mp4",
      closing_film: "close.mp4",
      watermark: "wm",
      fps: 60,
      page_layout: "full_screen",
      activeTemplateId: "tpl_draft",
      lastAppliedTemplateId: "tpl_draft",
    }

    useRenderSettingsStore.getState().commitFromDraft(draftConfig)

    const state = useRenderSettingsStore.getState()
    expect(state.resolution).toBe("2K")
    expect(state.page_layout).toBe("full_screen")
    expect(state.activeTemplateId).toBe("tpl_draft")
  })

  it("toVideoExportDesc and toConfigFields conversions", () => {
    const state = useRenderSettingsStore.getState()
    const desc = toVideoExportDesc(state)

    expect(desc.resolution).toBe(state.resolution)
    expect(desc.fps).toBe(state.fps)
    expect(desc.page_layout).toBe(state.page_layout)

    const fields = toConfigFields(desc)
    expect(fields.resolution).toBe(state.resolution)
    expect(fields.background).toBe(state.background)
    expect(fields.page_layout).toBe(state.page_layout)
  })
})
