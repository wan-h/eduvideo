import { z } from "zod"

import type { Resolution } from "../configs/resolution"

// ============================================================
// 共享常量
// ============================================================

export type PageLayout = "question_split" | "full_screen" | string

/**
 * 合成参数默认值。
 * TODO: 后续由专门的业务逻辑和接口动态管理。
 */
export const COMPOSITION_DEFAULTS = {
  resolution: "1080p" as Resolution,
  width: 1920,
  height: 1080,
  background: "default" as const,
  opening_film: "",
  closing_film: "",
  watermark: "",
  fps: 24,
  speed: 1,
  page_layout: "question_split" as const,
}

// ============================================================
// 渲染参数 Schema
// ============================================================

export const renderSettingsSchema = z.object({
  width: z.number().int().gt(0).default(1920),
  height: z.number().int().gt(0).default(1080),
  background: z.string().default("default"),
  opening_film: z.string().default(""),
  closing_film: z.string().default(""),
  watermark: z.string().default(""),
  fps: z.number().gt(0).default(24),
  speed: z.number().gt(0).default(1),
  page_layout: z.string().default("question_split"),
  /** calculateMetadata 注入：片头帧数，VideoComposition 内部定位用 */
  opening_film_duration_frames: z.number().int().min(0).optional(),
  /** calculateMetadata 注入：片尾帧数，VideoComposition 内部定位用 */
  closing_film_duration_frames: z.number().int().min(0).optional(),
})

/** RenderSettings 类型，用于 Composition inputProps */
export type RenderSettings = z.infer<typeof renderSettingsSchema>

// ============================================================
// 字幕 Schema
// ============================================================

export const feSubtitleSchema = z.object({
  id: z.string(),
  text: z.string(),
  audio: z.string(),
  duration: z.number().min(0),
})
export type FeSubtitle = z.infer<typeof feSubtitleSchema>

// ============================================================
// Segment Schema
// ============================================================

export const feSegmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  /** question_introduction 专有字段 */
  options: z.array(z.string()).optional(),
  subtitles: z.array(feSubtitleSchema),
})
export type FeSegment = z.infer<typeof feSegmentSchema>

// ============================================================
// Scene Schema
// ============================================================

export const sceneTypeSchema = z.enum([
  "question_introduction",
  "question_solution",
  "question_key_points",
])
export type SceneType = z.infer<typeof sceneTypeSchema>

export const feSceneSchema = z.object({
  id: z.string(),
  sceneType: sceneTypeSchema,
  segments: z.array(feSegmentSchema),
})
export type FeScene = z.infer<typeof feSceneSchema>

// ============================================================
// 前端展示数据结构
// ============================================================

export interface FeQuestionMetadata {
  title: string
  type: string
  level: string
  subject: string
  stage: string
  knowledge_points: string[]
  voice: string
  language: string
  video_synthesis_template_id: string | null
}

export interface FeQuestionContent {
  stem: string
  options: string[]
}

export interface FeVideoData {
  questionMetadata: FeQuestionMetadata
  questionContent: FeQuestionContent
  scenes: FeScene[]
}

// ============================================================
// Composition 入口 Schema（对应 Remotion Composition inputProps）
// ============================================================

export const videoCompositionSchema = z.object({
  scenes: z.array(feSceneSchema),
  renderSettings: renderSettingsSchema.optional(),
})

/** VideoComposition inputProps 类型 */
export type VideoCompositionProps = z.infer<typeof videoCompositionSchema>
