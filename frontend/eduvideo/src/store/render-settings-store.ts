import type { BackgroundType, Resolution } from "@ask2vid/shared"
import { COMPOSITION_DEFAULTS } from "@ask2vid/shared"
import { create } from "zustand"
import { immer } from "zustand/middleware/immer"

import { useQuestionMetadataStore } from "@/components/video/store/question-metadata-store"

export const DEFAULT_TEMPLATE_ID = "__default__"

/**
 * 当手动修改配置值时调用：将当前模板标记为"已脱离"。
 * draft 只需包含 activeTemplateId 和 lastAppliedTemplateId 两个字段。
 */
export function markDirtyFromTemplate(draft: {
  activeTemplateId: string | null
  lastAppliedTemplateId: string
}) {
  if (draft.activeTemplateId !== null) {
    draft.lastAppliedTemplateId = draft.activeTemplateId
    draft.activeTemplateId = null
  }
}

/** 将前端 activeTemplateId 转换为后端 video_synthesis_template_id */
function toBackendTemplateId(activeTemplateId: string | null): string | null {
  if (activeTemplateId === DEFAULT_TEMPLATE_ID || activeTemplateId === null) {
    return null
  }
  return activeTemplateId
}

/** 视频配置字段（不含模板追踪） */
export interface VideoConfigFields {
  resolution: Resolution
  background: BackgroundType | string
  opening_film: string
  closing_film: string
  watermark: string
  fps: number
  page_layout: string
}

/** 默认模板的配置值 */
export const DEFAULT_TEMPLATE_CONFIG: VideoConfigFields = {
  resolution: COMPOSITION_DEFAULTS.resolution,
  background: COMPOSITION_DEFAULTS.background,
  opening_film: COMPOSITION_DEFAULTS.opening_film,
  closing_film: COMPOSITION_DEFAULTS.closing_film,
  watermark: COMPOSITION_DEFAULTS.watermark,
  fps: COMPOSITION_DEFAULTS.fps,
  page_layout: COMPOSITION_DEFAULTS.page_layout,
}

/** 模板配置状态（VideoConfigFields + 模板追踪），正式 store 与草稿 store 共享 */
export interface TemplateConfigState extends VideoConfigFields {
  activeTemplateId: string | null
  lastAppliedTemplateId: string
}

export interface RenderSettingsState extends TemplateConfigState {
  /** 播放速率（不参与模板追踪，由 RenderSettingsBar 独立控制） */
  speed: number
}

/** 比较当前配置与模板配置，返回不一致的字段名列表 */
export function getDirtyFields(
  current: VideoConfigFields,
  templateConfig: VideoConfigFields | undefined
): string[] {
  if (!templateConfig) return []
  const keys = [
    "resolution",
    "background",
    "opening_film",
    "closing_film",
    "watermark",
    "fps",
    "page_layout",
  ] as const
  return keys.filter((k) => current[k] !== templateConfig[k])
}

interface RenderSettingsActions {
  setResolution: (r: Resolution) => void
  setBackground: (bg: BackgroundType | string) => void
  setOpeningFilm: (url: string) => void
  setClosingFilm: (url: string) => void
  setWatermark: (text: string) => void
  setFps: (fps: number) => void
  setPageLayout: (layout: string) => void
  setSpeed: (speed: number) => void
  /** 批量覆盖并设置 activeTemplateId（应用模板时使用） */
  applyTemplate: (
    templateId: string,
    settings: Partial<RenderSettingsState>
  ) => void
  /** 从草稿 store 提交配置到正式层 */
  commitFromDraft: (config: TemplateConfigState) => void
}

export const useRenderSettingsStore = create<
  RenderSettingsState & RenderSettingsActions
>()(
  immer((set) => ({
    resolution: COMPOSITION_DEFAULTS.resolution,
    background: COMPOSITION_DEFAULTS.background,
    opening_film: COMPOSITION_DEFAULTS.opening_film,
    closing_film: COMPOSITION_DEFAULTS.closing_film,
    watermark: COMPOSITION_DEFAULTS.watermark,
    fps: COMPOSITION_DEFAULTS.fps,
    speed: COMPOSITION_DEFAULTS.speed,
    page_layout: COMPOSITION_DEFAULTS.page_layout,
    activeTemplateId: DEFAULT_TEMPLATE_ID,
    lastAppliedTemplateId: DEFAULT_TEMPLATE_ID,

    setResolution: (r) =>
      set((s) => {
        if (s.resolution === r) return
        s.resolution = r
        markDirtyFromTemplate(s)
      }),
    setBackground: (bg) =>
      set((s) => {
        if (s.background === bg) return
        s.background = bg
        markDirtyFromTemplate(s)
      }),
    setOpeningFilm: (url) =>
      set((s) => {
        if (s.opening_film === url) return
        s.opening_film = url
        markDirtyFromTemplate(s)
      }),
    setClosingFilm: (url) =>
      set((s) => {
        if (s.closing_film === url) return
        s.closing_film = url
        markDirtyFromTemplate(s)
      }),
    setWatermark: (text) =>
      set((s) => {
        if (s.watermark === text) return
        s.watermark = text
        markDirtyFromTemplate(s)
      }),
    setFps: (fps) =>
      set((s) => {
        if (s.fps === fps) return
        s.fps = fps
        markDirtyFromTemplate(s)
      }),
    setPageLayout: (layout) =>
      set((s) => {
        if (s.page_layout === layout) return
        s.page_layout = layout
        markDirtyFromTemplate(s)
      }),
    setSpeed: (speed) =>
      set((s) => {
        s.speed = speed
      }),
    applyTemplate: (templateId, settings) => {
      set((s) => {
        if (settings.resolution !== undefined)
          s.resolution = settings.resolution
        if (settings.background !== undefined)
          s.background = settings.background
        if (settings.opening_film !== undefined)
          s.opening_film = settings.opening_film
        if (settings.closing_film !== undefined)
          s.closing_film = settings.closing_film
        if (settings.watermark !== undefined) s.watermark = settings.watermark
        if (settings.fps !== undefined) s.fps = settings.fps
        if (settings.page_layout !== undefined)
          s.page_layout = settings.page_layout
        s.activeTemplateId = templateId
        s.lastAppliedTemplateId = templateId
      })
      useQuestionMetadataStore
        .getState()
        .setTemplateId(toBackendTemplateId(templateId))
    },

    commitFromDraft: (config) => {
      set((s) => {
        s.resolution = config.resolution
        s.background = config.background
        s.opening_film = config.opening_film
        s.closing_film = config.closing_film
        s.watermark = config.watermark
        s.fps = config.fps
        s.page_layout = config.page_layout
        s.activeTemplateId = config.activeTemplateId
        s.lastAppliedTemplateId = config.lastAppliedTemplateId
      })
      useQuestionMetadataStore
        .getState()
        .setTemplateId(toBackendTemplateId(config.activeTemplateId))
    },
  }))
)

/** 将 store 状态转换为 VideoExportDesc（eduai API 格式） */
export function toVideoExportDesc(
  state: RenderSettingsState
): import("@/api/eduai/shared").VideoExportDesc {
  return {
    resolution: state.resolution,
    background: state.background,
    opening_film: state.opening_film,
    closing_film: state.closing_film,
    watermark: state.watermark,
    fps: state.fps,
    speed: state.speed,
    page_layout: state.page_layout,
  }
}

/** 从 API 返回的 VideoExportDesc 转换为 VideoConfigFields */
export function toConfigFields(
  desc: import("@/api/eduai/shared").VideoExportDesc
): VideoConfigFields {
  return {
    resolution:
      (desc.resolution as Resolution | undefined) ??
      DEFAULT_TEMPLATE_CONFIG.resolution,
    background: desc.background ?? DEFAULT_TEMPLATE_CONFIG.background,
    opening_film: desc.opening_film ?? "",
    closing_film: desc.closing_film ?? "",
    watermark: desc.watermark ?? "",
    fps: desc.fps ?? DEFAULT_TEMPLATE_CONFIG.fps,
    page_layout: desc.page_layout ?? DEFAULT_TEMPLATE_CONFIG.page_layout,
  }
}
