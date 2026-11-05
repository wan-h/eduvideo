import { execSync } from "node:child_process"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { afterAll, describe, expect, it } from "vitest"

import fixture from "./fixtures/minimal.js"

const SCRIPT = resolve(import.meta.dirname, "render-video.ts")
const TMP = resolve(import.meta.dirname, "../.vitest-tmp")

async function runCli(
  args: string
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const env: Record<string, string | undefined> = { ...process.env, NODE_ENV: "test" }
    // 清理 pnpm 环境变量，避免 npx/npm 触发 Unknown env config 警告
    for (const key of Object.keys(env)) {
      if (key.startsWith("npm_config_") || key.startsWith("NPM_CONFIG_")) {
        delete env[key]
      }
    }
    const out = execSync(`pnpm exec tsx ${SCRIPT} ${args}`, {
      cwd: resolve(import.meta.dirname, ".."),
      encoding: "utf-8",
      env,
      timeout: 60_000,
    })
    return { exitCode: 0, stdout: out, stderr: "" }
  } catch (err: unknown) {
    const e = err as { stdout?: Buffer; stderr?: Buffer; status?: number }
    return {
      exitCode: e.status ?? 1,
      stdout: e.stdout ? String(e.stdout) : "",
      stderr: e.stderr ? String(e.stderr) : "",
    }
  }
}

describe("render-video CLI", { timeout: 60_000 }, () => {
  afterAll(() => {
    rm(TMP, { recursive: true, force: true }).catch(() => {})
  })

  it("rejects missing --input and --output", async () => {
    const { exitCode, stderr } = await runCli("")
    expect(exitCode).toBe(1)
    expect(stderr).toContain("--input")
    expect(stderr).toContain("--output")
  })

  it("rejects missing --output when --input is provided", async () => {
    const inputFile = resolve(TMP, "dummy2.json")
    await mkdir(TMP, { recursive: true })
    await writeFile(inputFile, JSON.stringify(fixture))
    const { exitCode, stderr } = await runCli(`--input ${inputFile}`)
    expect(exitCode).toBe(1)
    expect(stderr).toContain("--output")
  })

  it("rejects invalid --background", async () => {
    const inputFile = resolve(TMP, "invalid-bg.json")
    await mkdir(TMP, { recursive: true })
    await writeFile(inputFile, JSON.stringify(fixture))

    const { exitCode, stderr } = await runCli(
      `--input ${inputFile} --output ${resolve(TMP, "bg.mp4")} --background invalid`
    )
    expect(exitCode).toBe(1)
    expect(stderr).toContain("background")
  })

  it("rejects non-existent input file", async () => {
    const { exitCode, stderr } = await runCli(
      "--input ./nonexistent.json --output /tmp/test.mp4"
    )
    expect(exitCode).toBe(1)
    expect(stderr).toContain("not found")
  })

  it("rejects JSON missing question_metadata", async () => {
    const inputFile = resolve(TMP, "bad-meta.json")
    await mkdir(TMP, { recursive: true })
    await writeFile(inputFile, JSON.stringify({ foo: "bar" }))

    const { exitCode, stderr } = await runCli(
      `--input ${inputFile} --output ${resolve(TMP, "bad.mp4")}`
    )
    expect(exitCode).toBe(1)
    expect(stderr).toContain("question_metadata")
  })

  it("uses default video_settings values", async () => {
    // This test only verifies parsing/defaults, doesn't render.
    // --parse-only exits immediately after JSON schema validation,
    // before Remotion bundling (which would timeout in CI).
    const inputFile = resolve(TMP, "valid.json")
    await mkdir(TMP, { recursive: true })
    await writeFile(inputFile, JSON.stringify(fixture))

    const { exitCode, stdout } = await runCli(
      `--input ${inputFile} --output ${resolve(TMP, "defaults.mp4")} --parse-only --json`
    )

    expect(exitCode).toBe(0)
    const lines = stdout.trim().split("\n").filter(Boolean)
    expect(lines.length).toBeGreaterThan(0)
    const first = JSON.parse(lines[0])
    expect(first.phase).toBe("bundling")
  })
})
