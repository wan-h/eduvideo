"use client"

import type { TaskStatusEnum } from "@/api/eduai/shared"
import { getTtsTaskStatus, submitTtsTask } from "@/api/eduai/tts"
import type { TtsSubmitReq } from "@/api/eduai/tts.types"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

// ============================================================
// 常量
// ============================================================

const POLL_INTERVAL = 2000
const POLL_TIMEOUT = 120_000
const MAX_CONCURRENT = 3

const STATUS_COMPLETED: TaskStatusEnum = 10
const STATUS_FAILED: TaskStatusEnum[] = [20, 30]

// ============================================================
// 类型
// ============================================================

export type TtsTaskStatus = "pending" | "polling" | "success" | "failed"

export interface TtsTaskState {
  status: TtsTaskStatus
  taskId: string
  subtitleId: string
  text: string
}

interface PendingItem {
  subtitleId: string
  text: string
  voice: string
  subject: string
  language: string
  scriptId: string
}

export interface TtsResult {
  url: string
  duration: number
}

export interface UseTtsTaskOptions {
  onTaskComplete?: (subtitleId: string, result: TtsResult) => void
  /** TTS 任意阶段失败时回调，用于上游回退乐观更新 */
  onTaskFailed?: (subtitleId: string) => void
  voice?: string
  subject?: string
  language?: string
  scriptId?: string
}

// ============================================================
// Hook
// ============================================================

export function useTtsTask(options: UseTtsTaskOptions = {}) {
  const [tasks, setTasks] = useState<Record<string, TtsTaskState>>({})
  const activeCountRef = useRef(0)
  const queueRef = useRef<PendingItem[]>([])
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const startTimeRef = useRef<Record<string, number>>({})
  const voiceRef = useRef(options.voice ?? "")
  const subjectRef = useRef(options.subject ?? "other")
  const languageRef = useRef(options.language ?? "chinese")
  const scriptIdRef = useRef(options.scriptId ?? "")

  // 同步 options 变化到 ref，避免闭包过期
  useEffect(() => {
    voiceRef.current = options.voice ?? ""
  }, [options.voice])

  useEffect(() => {
    subjectRef.current = options.subject ?? "other"
  }, [options.subject])

  useEffect(() => {
    languageRef.current = options.language ?? "chinese"
  }, [options.language])

  useEffect(() => {
    scriptIdRef.current = options.scriptId ?? ""
  }, [options.scriptId])

  const clearTimer = useCallback((timer: ReturnType<typeof setTimeout>) => {
    clearTimeout(timer)
    timersRef.current.delete(timer)
  }, [])

  const pollTask = useCallback(
    (subtitleId: string, taskId: string, text: string) => {
      const timer = setTimeout(async () => {
        clearTimer(timer)

        const elapsed =
          Date.now() - (startTimeRef.current[taskId] ?? Date.now())
        if (elapsed >= POLL_TIMEOUT) {
          setTasks((prev) => ({
            ...prev,
            [subtitleId]: { ...prev[subtitleId]!, status: "failed" },
          }))
          options.onTaskFailed?.(subtitleId)
          toast.error("字幕生成超时")
          return
        }

        try {
          const taskStatus = await getTtsTaskStatus(taskId)

          if (taskStatus.status === STATUS_COMPLETED) {
            let parsed: TtsResult | undefined
            try {
              parsed = JSON.parse(taskStatus.result ?? "") as TtsResult
            } catch {
              setTasks((prev) => ({
                ...prev,
                [subtitleId]: { ...prev[subtitleId]!, status: "failed" },
              }))
              options.onTaskFailed?.(subtitleId)
              toast.error("字幕生成结果解析失败")
              return
            }

            setTasks((prev) => {
              const { [subtitleId]: _, ...rest } = prev
              void _
              return rest
            })
            toast.success(`字幕生成完成: ${text.slice(0, 20)}...`)
            options.onTaskComplete?.(subtitleId, parsed)
            return
          }

          if (STATUS_FAILED.includes(taskStatus.status)) {
            setTasks((prev) => ({
              ...prev,
              [subtitleId]: { ...prev[subtitleId]!, status: "failed" },
            }))
            options.onTaskFailed?.(subtitleId)
            toast.error(`字幕生成失败: ${taskStatus.message || "未知错误"}`)
            return
          }

          pollTask(subtitleId, taskId, text)
        } catch {
          setTasks((prev) => ({
            ...prev,
            [subtitleId]: { ...prev[subtitleId]!, status: "failed" },
          }))
          options.onTaskFailed?.(subtitleId)
          toast.error("字幕生成状态查询失败")
        }
      }, POLL_INTERVAL)

      timersRef.current.add(timer)
    },
    [clearTimer, options]
  )

  const processQueue = useCallback(() => {
    while (
      activeCountRef.current < MAX_CONCURRENT &&
      queueRef.current.length > 0
    ) {
      const item = queueRef.current.shift()!
      activeCountRef.current += 1

      submitTtsTask({
        text: item.text,
        voice: item.voice,
        subject: item.subject as TtsSubmitReq["subject"],
        language: item.language as TtsSubmitReq["language"],
        script_id: item.scriptId,
      })
        .then((taskId) => {
          startTimeRef.current[taskId] = Date.now()
          setTasks((prev) => ({
            ...prev,
            [item.subtitleId]: {
              status: "polling",
              taskId,
              subtitleId: item.subtitleId,
              text: item.text,
            },
          }))
          pollTask(item.subtitleId, taskId, item.text)
        })
        .catch(() => {
          setTasks((prev) => {
            const { [item.subtitleId]: _, ...rest } = prev
            void _
            return rest
          })
          options.onTaskFailed?.(item.subtitleId)
        })
        .finally(() => {
          activeCountRef.current -= 1
          processQueue()
        })
    }
  }, [pollTask, options])

  const submit = useCallback(
    (subtitleId: string, text: string) => {
      const current = tasks[subtitleId]
      if (current?.status === "pending" || current?.status === "polling") return

      setTasks((prev) => ({
        ...prev,
        [subtitleId]: {
          status: "pending",
          taskId: "",
          subtitleId,
          text,
        },
      }))

      queueRef.current.push({
        subtitleId,
        text,
        voice: voiceRef.current,
        subject: subjectRef.current,
        language: languageRef.current,
        scriptId: scriptIdRef.current,
      })
      processQueue()
    },
    [tasks, processQueue]
  )

  const isRegenerating = useCallback(
    (subtitleId: string) => {
      const task = tasks[subtitleId]
      return task?.status === "pending" || task?.status === "polling"
    },
    [tasks]
  )

  const clearFailed = useCallback((subtitleId: string) => {
    setTasks((prev) => {
      const { [subtitleId]: _, ...rest } = prev
      void _
      return rest
    })
  }, [])

  useEffect(() => {
    const timers = timersRef.current
    const queue = queueRef.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
      queue.length = 0
      activeCountRef.current = 0
    }
  }, [])

  return { submit, isRegenerating, tasks, clearFailed }
}
