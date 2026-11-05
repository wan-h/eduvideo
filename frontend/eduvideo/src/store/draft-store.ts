import type { BackgroundType, Resolution } from "@ask2vid/shared"

import { create } from "zustand"
import { immer } from "zustand/middleware/immer"

import {
  markDirtyFromTemplate,
  type TemplateConfigState,
  type VideoConfigFields,
} from "./render-settings-store"

/** 比较草稿与正式配置 + 模板 ID，返回是否有差异（用于「应用模板」按钮 disabled） */
export function hasDraftDiff(
  draft: TemplateConfigState,
  formal: TemplateConfigState
): boolean {
  if (draft.activeTemplateId !== formal.activeTemplateId) return true
  const keys = [
    "resolution",
    "background",
    "opening_film",
    "closing_film",
    "watermark",
    "fps",
    "page_layout",
  ] as const
  return keys.some((k) => draft[k] !== formal[k])
}

interface DraftState {
  /** 草稿配置快照，null = dialog 未打开 */
  config: TemplateConfigState | null
  /* ── 生命周期 ── */
  openDraft: (snapshot: TemplateConfigState) => void
  closeDraft: () => void
  /* ── 模板操作 ── */
  applyTemplate: (
    templateId: string,
    settings: Partial<VideoConfigFields>
  ) => void
  /* ── 配置 setters ── */
  setResolution: (r: Resolution) => void
  setBackground: (bg: BackgroundType | string) => void
  setOpeningFilm: (url: string) => void
  setClosingFilm: (url: string) => void
  setWatermark: (text: string) => void
  setFps: (fps: number) => void
  setPageLayout: (layout: string) => void
}

export const useDraftStore = create<DraftState>()(
  immer((set) => ({
    config: null,

    /* ── 生命周期 ── */

    openDraft: (snapshot) =>
      set((s) => {
        if (s.config !== null) return
        s.config = { ...snapshot }
      }),

    closeDraft: () =>
      set((s) => {
        s.config = null
      }),

    /* ── 模板操作 ── */

    applyTemplate: (templateId, settings) =>
      set((s) => {
        if (!s.config) return
        if (settings.resolution !== undefined)
          s.config.resolution = settings.resolution
        if (settings.background !== undefined)
          s.config.background = settings.background
        if (settings.opening_film !== undefined)
          s.config.opening_film = settings.opening_film
        if (settings.closing_film !== undefined)
          s.config.closing_film = settings.closing_film
        if (settings.watermark !== undefined)
          s.config.watermark = settings.watermark
        if (settings.fps !== undefined) s.config.fps = settings.fps
        if (settings.page_layout !== undefined)
          s.config.page_layout = settings.page_layout
        s.config.activeTemplateId = templateId
        s.config.lastAppliedTemplateId = templateId
      }),

    /* ── 配置 setters（修改时标记脱离模板）── */

    setResolution: (r) =>
      set((s) => {
        if (!s.config || s.config.resolution === r) return
        s.config.resolution = r
        markDirtyFromTemplate(s.config)
      }),
    setBackground: (bg) =>
      set((s) => {
        if (!s.config || s.config.background === bg) return
        s.config.background = bg
        markDirtyFromTemplate(s.config)
      }),
    setOpeningFilm: (url) =>
      set((s) => {
        if (!s.config || s.config.opening_film === url) return
        s.config.opening_film = url
        markDirtyFromTemplate(s.config)
      }),
    setClosingFilm: (url) =>
      set((s) => {
        if (!s.config || s.config.closing_film === url) return
        s.config.closing_film = url
        markDirtyFromTemplate(s.config)
      }),
    setWatermark: (text) =>
      set((s) => {
        if (!s.config || s.config.watermark === text) return
        s.config.watermark = text
        markDirtyFromTemplate(s.config)
      }),
    setFps: (fps) =>
      set((s) => {
        if (!s.config || s.config.fps === fps) return
        s.config.fps = fps
        markDirtyFromTemplate(s.config)
      }),
    setPageLayout: (layout) =>
      set((s) => {
        if (!s.config || s.config.page_layout === layout) return
        s.config.page_layout = layout
        markDirtyFromTemplate(s.config)
      }),
  }))
)
