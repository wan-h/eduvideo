import type { RawVideoData, RenderSettings } from "@ask2vid/shared"
import express, { type Router } from "express"

import { registry } from "./openapi.js"
import { cancelJob, createJob, getAllJobs, getJob } from "./queue.js"
import {
  CancelJobResponseSchema,
  CreateRenderRequestSchema,
  CreateRenderResponseSchema,
  ErrorResponseSchema,
  JobDetailResponseSchema,
  JobIdParamSchema,
  JobsListResponseSchema,
  parseRenderPayload,
} from "./schemas.js"

const router: Router = express.Router()

// ── POST /api/renders ──────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/renders",
  description: "创建渲染任务",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateRenderRequestSchema },
      },
    },
  },
  responses: {
    202: {
      description: "任务已入队",
      content: { "application/json": { schema: CreateRenderResponseSchema } },
    },
    400: {
      description: "请求体无效",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "服务器内部错误",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

router.post("/renders", async (req, res) => {
  const parsed = CreateRenderRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: `Invalid request body: ${parsed.error.message}`,
    })
    return
  }

  let rawData: RawVideoData
  let renderSettings: RenderSettings
  let objectKey: string
  try {
    ;({ rawData, renderSettings, objectKey } = parseRenderPayload(parsed.data))
  } catch (err) {
    res.status(400).json({
      success: false,
      error:
        err instanceof SyntaxError
          ? `Invalid JSON in script/settings: ${err.message}`
          : err instanceof Error
            ? err.message
            : "Invalid payload",
    })
    return
  }

  try {
    const jobId = await createJob(rawData, renderSettings, objectKey)
    res.status(202).json({
      success: true,
      data: { jobId, status: "queued" },
    })
  } catch (error) {
    req.log?.error({ err: error }, "create render job failed")
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    })
  }
})

// ── GET /api/renders ───────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/renders",
  description: "获取所有渲染任务",
  responses: {
    200: {
      description: "任务列表",
      content: { "application/json": { schema: JobsListResponseSchema } },
    },
  },
})

router.get("/renders", (_req, res) => {
  const allJobs = getAllJobs()
  res.json({
    success: true,
    data: allJobs.map((j) => ({
      id: j.id,
      status: j.status,
      phase: j.phase,
      progress: j.progress,
      error: j.error,
      videoUrl: j.videoUrl,
    })),
  })
})

// ── GET /api/renders/:jobId ────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/renders/{jobId}",
  description: "查询渲染任务状态",
  request: {
    params: JobIdParamSchema,
  },
  responses: {
    200: {
      description: "任务详情",
      content: { "application/json": { schema: JobDetailResponseSchema } },
    },
    404: {
      description: "任务不存在",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

router.get("/renders/:jobId", (req, res) => {
  const job = getJob(req.params.jobId)
  if (!job) {
    res.status(404).json({
      success: false,
      error: "Job not found",
    })
    return
  }

  res.json({
    success: true,
    data: {
      id: job.id,
      status: job.status,
      phase: job.phase,
      progress: job.progress,
      error: job.error,
      videoUrl: job.videoUrl,
    },
  })
})

// ── DELETE /api/renders/:jobId ─────────────────────────────────────

registry.registerPath({
  method: "delete",
  path: "/renders/{jobId}",
  description: "取消渲染任务",
  request: {
    params: JobIdParamSchema,
  },
  responses: {
    200: {
      description: "取消成功",
      content: { "application/json": { schema: CancelJobResponseSchema } },
    },
    404: {
      description: "任务不存在或已完成",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

router.delete("/renders/:jobId", async (req, res) => {
  try {
    const cancelled = await cancelJob(req.params.jobId)
    if (!cancelled) {
      res.status(404).json({
        success: false,
        error: "Job not found or already completed",
      })
      return
    }

    res.json({
      success: true,
      data: { message: "Job cancelled" },
    })
  } catch (error) {
    req.log?.error({ err: error }, "cancel render job failed")
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    })
  }
})

export default router
