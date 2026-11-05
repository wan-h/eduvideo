import { existsSync, promises as fs } from "node:fs"
import { createRequire } from "node:module"
import { dirname, isAbsolute, join, resolve as pathResolve } from "node:path"

import { bundle } from "@remotion/bundler"
import { renderMedia, selectComposition } from "@remotion/renderer"

import type { VideoCompositionProps } from "@ask2vid/shared"

const _require = createRequire(import.meta.url)
const SHARED_ROOT = dirname(dirname(_require.resolve("@ask2vid/shared")))

/** 优先使用系统安装的 Chromium，避免运行时下载 Chrome Headless Shell (~92MB) */
const BROWSER_EXECUTABLE = (() => {
  const path = process.env.CHROMIUM_PATH ?? "/usr/bin/chromium"
  return existsSync(path) ? path : null
})()

export type RenderPhase =
  "bundling" | "selecting" | "rendering" | "completed" | "failed"

export interface RenderCallbacks {
  onProgress?: (progress: number) => void
  onPhaseChange?: (phase: RenderPhase) => void
}

export interface RenderOptions extends RenderCallbacks {
  inputProps: VideoCompositionProps
  outputFile: string
  concurrency?: number
  bundleCacheDir?: string
}

export async function renderVideo(options: RenderOptions): Promise<void> {
  const {
    inputProps,
    outputFile,
    concurrency,
    bundleCacheDir: rawCacheDir = join(process.cwd(), "bundles", "default"),
    onProgress,
    onPhaseChange,
  } = options

  const bundleCacheDir = isAbsolute(rawCacheDir)
    ? rawCacheDir
    : pathResolve(rawCacheDir)

  onPhaseChange?.("bundling")

  await fs.mkdir(dirname(outputFile), { recursive: true })
  await fs.mkdir(bundleCacheDir, { recursive: true })

  const serveUrl = await bundle(
    join(SHARED_ROOT, "src", "Root.tsx"),
    undefined,
    {
      outDir: bundleCacheDir,
      publicDir: join(SHARED_ROOT, "public"),
    }
  )

  onPhaseChange?.("selecting")

  const chromiumOptions = {
    disableSandbox: true,
    enableMultiProcessOnLinux: true,
    args: [
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--no-zygote",
    ],
  }

  const composition = await selectComposition({
    serveUrl,
    id: "VideoComposition",
    inputProps,
    chromiumOptions,
    browserExecutable: BROWSER_EXECUTABLE,
  })

  onPhaseChange?.("rendering")

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    x264Preset: "ultrafast",
    outputLocation: outputFile,
    inputProps,
    concurrency,
    chromiumOptions,
    browserExecutable: BROWSER_EXECUTABLE,
    onProgress: ({ progress }) => {
      onProgress?.(Math.min(progress, 0.99))
    },
  })

  onProgress?.(1)
  onPhaseChange?.("completed")
}
