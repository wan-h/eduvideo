import { performance } from "node:perf_hooks"

import { logger } from "./logger.js"

export interface StageSummary {
  name: string
  durationMs: number
}

/**
 * 阶段耗时计时器。
 *
 * 用法：
 *   const timer = new StageTimer("render-job-001")
 *   timer.start("bundle")
 *   await doBundle()
 *   timer.start("render")      // 自动结束上一阶段
 *   await doRender()
 *   timer.end()                 // 结束最后一个阶段
 *   timer.summary()             // 打印汇总表
 */
export class StageTimer {
  private stages: StageSummary[] = []
  private currentStage: string | null = null
  private stageStart = 0
  private readonly totalStart: number
  private readonly label: string

  constructor(label: string) {
    this.label = label
    this.totalStart = performance.now()
  }

  /** 开始新阶段（自动结束前一阶段） */
  start(name: string): void {
    this.finishCurrent()
    this.currentStage = name
    this.stageStart = performance.now()
    logger.info({ timer: this.label, stage: name }, `⏱  ${name} 开始`)
  }

  /** 显式结束当前阶段 */
  end(): void {
    this.finishCurrent()
  }

  /** 打印耗时汇总表 */
  summary(): void {
    this.finishCurrent()
    const totalMs = Math.round(performance.now() - this.totalStart)

    const pctStr = (ms: number) => {
      const pct = totalMs > 0 ? Math.round((ms / totalMs) * 100) : 0
      return `${pct}%`.padStart(4)
    }

    const lines = [
      "",
      `耗时汇总 [${this.label}]`,
      "---",
      ...this.stages.map(
        (s) => `${s.name}: ${pctStr(s.durationMs)}  ${this.fmt(s.durationMs)}`
      ),
      "---",
      `total: ${this.fmt(totalMs)}`,
      "",
    ]

    const output = lines.join("\n")
    process.stdout.write(output + "\n")
    logger.info({ timer: this.label, stages: this.stages, totalMs }, "耗时汇总")
  }

  private finishCurrent(): void {
    if (this.currentStage === null) return
    const durationMs = Math.round(performance.now() - this.stageStart)
    this.stages.push({ name: this.currentStage, durationMs })
    logger.info(
      { timer: this.label, stage: this.currentStage, durationMs },
      `⏱  ${this.currentStage} 完成 (${this.fmt(durationMs)})`
    )
    this.currentStage = null
  }

  private fmt(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    const s = ms / 1000
    if (s < 60) return `${s.toFixed(1)}s`
    const m = Math.floor(s / 60)
    const rem = (s % 60).toFixed(0)
    return `${m}m${rem}s`
  }
}
