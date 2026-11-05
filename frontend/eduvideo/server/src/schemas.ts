import type { RawVideoData, RenderSettings } from "@ask2vid/shared"
import { renderSettingsSchema } from "@ask2vid/shared"
import { z } from "zod"

export const CreateRenderRequestSchema = z
  .object({
    script: z.string().min(1).meta({
      title: "JSON 字符串，解码后等价于 RawVideoData（不含 video_settings）",
    }),
    path: z
      .string()
      .min(1)
      .regex(/^[^\s/].*\.[a-z0-9]+$/i)
      .meta({
        title:
          "MinIO object key，例：ai-teach-video-gen/u123/t456/public/x.mp4",
      }),
    export_settings: z.string().min(1).meta({
      title:
        "JSON 字符串，解析后形如 {width, height, background, opening_film, closing_film, watermark, fps, speed}",
    }),
  })
  .meta({ id: "CreateRenderRequest" })

export type CreateRenderRequest = z.infer<typeof CreateRenderRequestSchema>

export const RenderSettingsSchema = renderSettingsSchema.meta({
  id: "RenderSettings",
})

export function parseRenderPayload(body: CreateRenderRequest): {
  rawData: RawVideoData
  renderSettings: RenderSettings
  objectKey: string
} {
  const renderSettings = RenderSettingsSchema.parse(
    JSON.parse(body.export_settings)
  ) as RenderSettings
  const scriptObj = JSON.parse(body.script)
  return {
    rawData: scriptObj as RawVideoData,
    renderSettings,
    objectKey: body.path,
  }
}

export const CreateRenderResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.object({
      jobId: z.string(),
      status: z.string(),
    }),
  })
  .meta({ id: "CreateRenderResponse" })

export const JobSchema = z
  .object({
    id: z.string(),
    status: z.enum(["queued", "in-progress", "completed", "failed"]),
    phase: z.enum([
      "queued",
      "preparing",
      "rendering",
      "uploading",
      "completed",
      "failed",
    ]),
    progress: z.number(),
    error: z.string().optional(),
    videoUrl: z.string().optional().meta({ title: "MinIO 公开访问 URL" }),
  })
  .meta({ id: "Job" })

export const JobsListResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.array(JobSchema),
  })
  .meta({ id: "JobsListResponse" })

export const JobDetailResponseSchema = z
  .object({
    success: z.boolean(),
    data: JobSchema,
  })
  .meta({ id: "JobDetailResponse" })

export const CancelJobResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.object({
      message: z.string(),
    }),
  })
  .meta({ id: "CancelJobResponse" })

export const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
  })
  .meta({ id: "ErrorResponse" })

export const JobIdParamSchema = z
  .object({
    jobId: z.string(),
  })
  .meta({ id: "JobIdParam" })
