"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuestionMetadataStore } from "../store/question-metadata-store"
import { useSubtitleStore } from "../store/subtitle-store"
import { useTtsGenerationStore } from "./tts-generation-store"
import { useTtsTask } from "./use-tts-task"

export interface TtsWorkflowState {
  status: "generating" | "done" | "error"
  result?: { url: string; duration: number }
  error?: string
}

export function useTtsWorkflow(
  sceneId: string,
  segmentId: string,
  scriptId: string,
  opts?: {
    onTaskFailed?: (subtitleId: string) => void
    onTaskSucceeded?: (subtitleId: string) => void
  }
) {
  const sceneIdRef = useRef(sceneId)
  const segmentIdRef = useRef(segmentId)
  const onTaskFailedRef = useRef(opts?.onTaskFailed)
  const onTaskSucceededRef = useRef(opts?.onTaskSucceeded)

  useEffect(() => {
    onTaskFailedRef.current = opts?.onTaskFailed
  }, [opts?.onTaskFailed])

  useEffect(() => {
    onTaskSucceededRef.current = opts?.onTaskSucceeded
  }, [opts?.onTaskSucceeded])

  useEffect(() => {
    sceneIdRef.current = sceneId
  }, [sceneId])

  useEffect(() => {
    segmentIdRef.current = segmentId
  }, [segmentId])

  const metadata = useQuestionMetadataStore((s) => s.metadata)

  const [completed, setCompleted] = useState<Record<string, TtsWorkflowState>>(
    {}
  )

  const {
    submit: submitTts,
    isRegenerating,
    tasks,
  } = useTtsTask({
    voice: metadata?.voice ?? "",
    subject: metadata?.subject ?? "other",
    language: metadata?.language ?? "chinese",
    scriptId,
    onTaskComplete: (subtitleId, result) => {
      const sid = sceneIdRef.current
      const segId = segmentIdRef.current
      useSubtitleStore.getState().updateSubtitle(sid, segId, subtitleId, {
        audio: result.url,
        duration: result.duration,
      })
      setCompleted((prev) => ({
        ...prev,
        [subtitleId]: { status: "done", result },
      }))
      onTaskSucceededRef.current?.(subtitleId)
    },
    onTaskFailed: (subtitleId) => {
      onTaskFailedRef.current?.(subtitleId)
    },
  })

  const state: Record<string, TtsWorkflowState> = {}

  for (const [id, task] of Object.entries(tasks)) {
    if (task.status === "pending" || task.status === "polling") {
      state[id] = { status: "generating" }
    } else if (task.status === "failed") {
      state[id] = { status: "error", error: "生成失败" }
    }
  }

  for (const [id, ws] of Object.entries(completed)) {
    state[id] = ws
  }

  const generatingCount = useMemo(
    () =>
      Object.values(tasks).filter(
        (t) => t.status === "pending" || t.status === "polling"
      ).length,
    [tasks]
  )

  useEffect(() => {
    useTtsGenerationStore.getState().setCount(generatingCount)
  }, [generatingCount])

  const trigger = useCallback(
    (subtitleId: string, text: string) => {
      submitTts(subtitleId, text)
    },
    [submitTts]
  )

  return { state, trigger, isGenerating: isRegenerating }
}
