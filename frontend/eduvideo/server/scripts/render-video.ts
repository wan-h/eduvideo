#!/usr/bin/env node
/**
 * CLI 渲染脚本 - 通过 JSON 文件驱动视频渲染
 * 支持并发帧渲染、Webpack 缓存
 *
 * 用法:
 *   tsx scripts/render-video.ts --input <json-file> --output <output-file> [--concurrency <num>]
 *
 * 示例:
 *   tsx scripts/render-video.ts --input ./template.json --output ./out/video.mp4
 *   tsx scripts/render-video.ts --input ./custom-video.json --output ./out/custom.mp4 --concurrency 8
 */

import { existsSync, mkdirSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { parseArgs } from "node:util"

import type { RawVideoData, RenderSettings } from "@ask2vid/shared"
import {
  COMPOSITION_DEFAULTS,
  dataToFe,
  rawVideoDataSchema,
  videoCompositionSchema,
} from "@ask2vid/shared"
import { StageTimer } from "../src/lib/stage-timer.js"
import { renderVideo } from "../src/renderer.js"

interface RenderVideoArgs {
  input: string
  output: string
  concurrency?: number
  width: number
  height: number
  fps: number
  background: string
  openingFilm: string
  closingFilm: string
  watermark: string
  pageLayout?: string
  bundleCacheDir: string
  json: boolean
  quiet: boolean
  /** 仅做参数解析 + JSON 校验，不执行实际渲染（用于测试） */
  parseOnly: boolean
}

const DEFAULTS = {
  bundleCacheDir: "bundles/default",
} as const

function parseCliArgs(rawArgs: string[]): RenderVideoArgs {
  const { values, positionals } = parseArgs({
    args: rawArgs,
    options: {
      input: { type: "string" },
      output: { type: "string" },
      concurrency: { type: "string" },
      width: { type: "string" },
      height: { type: "string" },
      fps: { type: "string" },
      background: { type: "string" },
      "opening-film": { type: "string" },
      "closing-film": { type: "string" },
      watermark: { type: "string" },
      "page-layout": { type: "string" },
      "bundle-cache-dir": { type: "string" },
      json: { type: "boolean", default: false },
      quiet: { type: "boolean", default: false },
      "parse-only": { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: false,
  })

  if (!values.input && !values.output) {
    throw new Error(
      "Missing required options: --input <json-file>, --output <output-file>"
    )
  }
  if (!values.input) {
    throw new Error("Missing required option: --input <json-file>")
  }
  if (!values.output) {
    throw new Error("Missing required option: --output <output-file>")
  }
  if (positionals.length > 0) {
    throw new Error(`Unexpected positional argument: ${positionals.join(" ")}`)
  }

  const width = values.width
    ? parseInt(values.width, 10)
    : COMPOSITION_DEFAULTS.width
  const height = values.height
    ? parseInt(values.height, 10)
    : COMPOSITION_DEFAULTS.height
  if (width <= 0 || !Number.isInteger(width)) {
    throw new Error(
      `Invalid --width "${values.width}". Must be a positive integer.`
    )
  }
  if (height <= 0 || !Number.isInteger(height)) {
    throw new Error(
      `Invalid --height "${values.height}". Must be a positive integer.`
    )
  }

  const background = (values.background ??
    COMPOSITION_DEFAULTS.background) as string
  const isUrl = /^https?:\/\//.test(background)
  if (!isUrl && !["default", "blackboard2", "gray"].includes(background)) {
    throw new Error(
      `Invalid --background "${background}". Must be one of: default, blackboard2, gray, or a valid https?:// URL`
    )
  }

  const fps = values.fps ? parseInt(values.fps, 10) : COMPOSITION_DEFAULTS.fps
  if (fps <= 0 || !Number.isInteger(fps)) {
    throw new Error(
      `Invalid --fps "${values.fps}". Must be a positive integer.`
    )
  }

  return {
    input: values.input,
    output: values.output,
    concurrency: values.concurrency
      ? parseInt(values.concurrency, 10)
      : undefined,
    width,
    height,
    fps,
    background,
    openingFilm: values["opening-film"] ?? COMPOSITION_DEFAULTS.opening_film,
    closingFilm: values["closing-film"] ?? COMPOSITION_DEFAULTS.closing_film,
    watermark: values.watermark ?? COMPOSITION_DEFAULTS.watermark,
    pageLayout: values["page-layout"],
    bundleCacheDir: values["bundle-cache-dir"] ?? DEFAULTS.bundleCacheDir,
    json: values.json ?? false,
    quiet: values.quiet ?? false,
    parseOnly: values["parse-only"] ?? false,
  }
}

interface JsonLine {
  phase: string
  progress: number
  timestamp: number
}

function emit(args: RenderVideoArgs, line: JsonLine): void {
  if (args.json) {
    process.stdout.write(JSON.stringify(line) + "\n")
  }
}

function log(args: RenderVideoArgs, message: string): void {
  if (!args.quiet && !args.json) {
    process.stdout.write(message + "\n")
  }
}

function validateRawVideoData(data: unknown): RawVideoData {
  const parseResult = rawVideoDataSchema.safeParse(data)
  if (!parseResult.success) {
    throw new Error(`JSON 数据格式校验失败: ${parseResult.error.message}`)
  }
  return parseResult.data
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2))

  const inputPath = resolve(args.input)
  if (!existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`)
  }

  const outputPath = resolve(args.output)
  const outputDir = dirname(outputPath)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  log(args, `Input:  ${inputPath}`)
  log(args, `Output: ${outputPath}`)

  const jsonContent = await readFile(inputPath, "utf-8")
  const parsed = JSON.parse(jsonContent)

  const rawData = validateRawVideoData(parsed)

  const renderSettings: RenderSettings = {
    width: args.width,
    height: args.height,
    fps: args.fps,
    speed: COMPOSITION_DEFAULTS.speed,
    background: args.background as RenderSettings["background"],
    opening_film: args.openingFilm,
    closing_film: args.closingFilm,
    watermark: args.watermark,
    page_layout:
      args.pageLayout ??
      parsed.video_settings?.page_layout ??
      COMPOSITION_DEFAULTS.page_layout,
  }

  log(
    args,
    `Settings: ${args.width}x${args.height} @ ${renderSettings.fps}fps, background=${renderSettings.background}`
  )
  if (args.concurrency) {
    log(args, `Concurrency: ${args.concurrency} frames`)
  }

  const feData = dataToFe(rawData)
  const inputProps = videoCompositionSchema.parse({
    scenes: feData.scenes,
    renderSettings,
  })

  // --parse-only: 仅校验参数与 JSON 格式，不执行实际渲染（测试专用）
  if (args.parseOnly) {
    emit(args, { phase: "bundling", progress: 0, timestamp: Date.now() })
    log(args, "[parse-only] validation passed, skipping render")
    return
  }

  const timer = new StageTimer("cli-render")

  await renderVideo({
    inputProps,
    outputFile: outputPath,
    concurrency: args.concurrency,
    bundleCacheDir: args.bundleCacheDir,
    onPhaseChange: (phase) => {
      if (phase === "failed") return

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

      emit(args, { phase, progress: 0, timestamp: Date.now() })
      log(args, `[${phase}]`)
    },
    onProgress: (progress) => {
      emit(args, {
        phase: "rendering",
        progress: Math.round(progress * 100) / 100,
        timestamp: Date.now(),
      })
      if (args.json) return
      if (!args.quiet) {
        const pct = Math.round(progress * 100)
        process.stdout.write(`\r  Progress: ${pct}%`)
      }
    },
  })

  if (args.json) {
    emit(args, { phase: "completed", progress: 1, timestamp: Date.now() })
  }

  timer.summary()
  log(args, args.json ? "" : `\nDone: ${outputPath}`)
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`Error: ${message}\n`)
  process.exit(1)
})
