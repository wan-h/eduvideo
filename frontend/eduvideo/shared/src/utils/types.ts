import { z } from "zod"

// ============================================================
// 共享基础类型
// ============================================================

export type BackgroundType = "default" | "blackboard2" | "gray"

/** 水印设置 — 由运行时字符串解析得出，方便类型维护 */
export interface WatermarkSettings {
  type: "text" | "image"
  /** 文字内容或图片 URL */
  value: string
}

// ============================================================
// 后端原始数据类型（Backend Raw Types）- Zod Schema
// ============================================================

export const rawSubtitleSchema = z.object({
  text: z.string(),
  audio: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  duration: z.number().nonnegative(),
})
export type RawSubtitle = z.infer<typeof rawSubtitleSchema>

export const rawSegmentSchema = z.object({
  title: z.string(),
  content: z.string(),
  subtitles: z.array(rawSubtitleSchema),
})
export type RawSegment = z.infer<typeof rawSegmentSchema>

export const rawIntroSceneSchema = z.object({
  stem: z.string(),
  options: z.array(z.string()),
  subtitles: z.array(rawSubtitleSchema),
})
export type RawIntroScene = z.infer<typeof rawIntroSceneSchema>

export const rawSegmentSceneSchema = z.object({
  segments: z.array(rawSegmentSchema),
})
export type RawSegmentScene = z.infer<typeof rawSegmentSceneSchema>

export const rawScenesSchema = z.object({
  question_introduction: rawIntroSceneSchema,
  question_solution: rawSegmentSceneSchema,
  question_key_points: rawSegmentSceneSchema,
})
export type RawScenes = z.infer<typeof rawScenesSchema>

export const rawQuestionMetadataSchema = z.object({
  title: z.string(),
  type: z.string(),
  level: z.string(),
  subject: z.string(),
  stage: z.string(),
  knowledge_points: z.array(z.string()),
  voice: z
    .string()
    .optional()
    .transform((v) => v ?? ""),
  language: z
    .string()
    .optional()
    .transform((v) => v ?? "chinese"),
  video_synthesis_template_id: z.string().nullable(),
})
export type RawQuestionMetadata = z.infer<typeof rawQuestionMetadataSchema>

export const rawQuestionContentSchema = z.object({
  stem: z.string(),
  options: z.array(z.string()),
})
export type RawQuestionContent = z.infer<typeof rawQuestionContentSchema>

export const rawVideoDataSchema = z.object({
  question_metadata: rawQuestionMetadataSchema,
  question_content: rawQuestionContentSchema,
  scenes: rawScenesSchema,
})
export type RawVideoData = z.infer<typeof rawVideoDataSchema>
