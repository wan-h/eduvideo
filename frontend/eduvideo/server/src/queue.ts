import { promises as fs } from "node:fs"
import { join } from "node:path"

import { v7 as uuidv7 } from "uuid"

import type { RawVideoData, RenderSettings } from "@ask2vid/shared"
import { dataToFe, videoCompositionSchema } from "@ask2vid/shared"
import { logger } from "./lib/logger.js"
import { StageTimer } from "./lib/stage-timer.js"
import { renderVideo } from "./renderer.js"
import { uploadObject } from "./storage.js"

export type RenderPhase =
  "queued" | "preparing" | "rendering" | "uploading" | "completed" | "failed"

export interface RenderJob {
  id: string
  status: "queued" | "in-progress" | "completed" | "failed"
  phase: RenderPhase
  progress: number
  error?: string
  videoUrl?: string
  rawData: RawVideoData
  renderSettings: RenderSettings
  objectKey: string
}

const jobs = new Map<string, RenderJob>()
const rendersDir = join(process.cwd(), "renders")

let queue: Promise<void> = Promise.resolve()

function onQueueError(err: unknown) {
  logger.error({ err }, "queue processing error, resuming queue")
}

export function getJob(jobId: string): RenderJob | undefined {
  return jobs.get(jobId)
}

export function getAllJobs(): RenderJob[] {
  return Array.from(jobs.values())
}

export async function cancelJob(jobId: string): Promise<boolean> {
  const job = jobs.get(jobId)
  if (!job) return false
  if (job.status === "completed" || job.status === "failed") return false
  job.status = "failed"
  job.phase = "failed"
  job.error = "Cancelled by user"
  return true
}

export async function createJob(
  rawData: RawVideoData,
  renderSettings: RenderSettings,
  objectKey: string
): Promise<string> {
  const jobId = uuidv7()
  const job: RenderJob = {
    id: jobId,
    status: "queued",
    phase: "queued",
    progress: 0,
    rawData,
    renderSettings,
    objectKey,
  }
  jobs.set(jobId, job)
  queue = queue.then(() => processRender(jobId), onQueueError)
  return jobId
}

async function processRender(jobId: string) {
  const job = jobs.get(jobId)
  if (!job || job.status === "failed") return

  const jobLogger = logger.child({ jobId })
  const outputFile = join(rendersDir, `${jobId}.mp4`)
  const timer = new StageTimer(`job-${jobId.slice(0, 8)}`)

  try {
    job.status = "in-progress"

    timer.start("prepare")
    const feData = dataToFe(job.rawData)
    const inputProps = videoCompositionSchema.parse({
      scenes: feData.scenes,
      renderSettings: job.renderSettings,
    })
    timer.end()

    await renderVideo({
      inputProps,
      outputFile,
      onPhaseChange: (phase) => {
        // 映射 renderer 的新阶段到队列的 phase（保持向后兼容）
        if (phase === "bundling" || phase === "selecting") {
          job.phase = "preparing"
        } else if (phase !== "failed") {
          job.phase = phase
        }

        const stageMap: Record<string, string> = {
          bundling: "bundle",
          selecting: "select",
          rendering: "render",
        }

        if (phase === "completed") {
          timer.end()
        } else {
          timer.start(stageMap[phase] ?? phase)
        }
      },
      onProgress: (progress) => {
        if (job.status === "in-progress") {
          job.progress = Math.min(progress, 0.95)
        }
      },
    })

    timer.start("upload")
    job.phase = "uploading"
    const publicUrl = await uploadObject(outputFile, job.objectKey)
    timer.end()

    await fs.unlink(outputFile).catch(() => {})

    job.status = "completed"
    job.phase = "completed"
    job.progress = 1
    job.videoUrl = publicUrl

    timer.summary()
  } catch (error) {
    timer.end()
    timer.summary()

    if (job.status !== "in-progress") return
    job.status = "failed"
    job.phase = "failed"
    job.error = error instanceof Error ? error.message : "Unknown error"
    jobLogger.error({ stage: "job-failed", err: error }, "render failed")
    await fs.unlink(outputFile).catch(() => {})
  }
}
