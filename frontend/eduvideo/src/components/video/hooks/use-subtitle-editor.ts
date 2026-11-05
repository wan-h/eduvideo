import type { PlayerRef } from "@remotion/player"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import type { FeSubtitle } from "@ask2vid/shared"

import { useSceneStore } from "../store/scene-store"
import { useSubtitleStore } from "../store/subtitle-store"
import type { SubtitleFrameInfo } from "../utils/scene-frame"
import { useAudioPlayer } from "./use-audio-player"
import { useTtsWorkflow } from "./use-tts-workflow"

interface CardEditState {
  isEditing: boolean
  text: string
}

export function useSubtitleEditor(
  playerRef: React.RefObject<PlayerRef | null>,
  subtitleFrameMap: Map<string, SubtitleFrameInfo>,
  scriptId: string
) {
  const activeSceneId = useSceneStore((s) => s.activeSceneId)
  const selectedSegmentId = useSceneStore((s) => s.selectedSegmentId)
  const scenes = useSceneStore((s) => s.scenes)
  const addSubtitle = useSubtitleStore((s) => s.addSubtitle)
  const updateSubtitle = useSubtitleStore((s) => s.updateSubtitle)
  const deleteSubtitle = useSubtitleStore((s) => s.deleteSubtitle)
  const selectedSubtitleId = useSceneStore((s) => s.selectedSubtitleId)
  const setSelectedSubtitle = useSceneStore((s) => s.setSelectedSubtitle)

  const activeScene = scenes.find((s) => s.id === activeSceneId) ?? scenes[0]
  const activeSegment = activeScene?.segments.find(
    (s) => s.id === selectedSegmentId
  )
  const subtitles = useMemo(
    () => activeSegment?.subtitles ?? [],
    [activeSegment]
  )

  const [editingCards, setEditingCards] = useState<
    Record<string, CardEditState>
  >({})
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const { playingId, play, stop } = useAudioPlayer()

  // 记录乐观更新前的原始文案，用于 TTS 失败时回退
  const pendingRollbackRef = useRef<Record<string, string>>({})
  const activeSceneRef = useRef(activeScene)
  const activeSegmentRef = useRef(activeSegment)

  useEffect(() => {
    activeSceneRef.current = activeScene
  }, [activeScene])

  useEffect(() => {
    activeSegmentRef.current = activeSegment
  }, [activeSegment])

  const handleTtsFailedRef = useRef((_subtitleId: string) => {})

  handleTtsFailedRef.current = (subtitleId: string) => {
    const originalText = pendingRollbackRef.current[subtitleId]
    if (originalText !== undefined) {
      const scene = activeSceneRef.current
      const segment = activeSegmentRef.current
      if (scene && segment) {
        updateSubtitle(scene.id, segment.id, subtitleId, { text: originalText })
        toast.error("字幕生成失败，文案已回退")
      }
      delete pendingRollbackRef.current[subtitleId]
    }
  }

  const handleTtsFailed = useCallback((subtitleId: string) => {
    handleTtsFailedRef.current(subtitleId)
  }, [])

  const handleTtsSucceeded = useCallback((subtitleId: string) => {
    delete pendingRollbackRef.current[subtitleId]
  }, [])

  const { trigger: submitTts, isGenerating: isRegenerating } = useTtsWorkflow(
    activeScene?.id ?? "",
    activeSegment?.id ?? "",
    scriptId,
    { onTaskFailed: handleTtsFailed, onTaskSucceeded: handleTtsSucceeded }
  )

  // 切换 segment 时清理残留编辑状态
  useEffect(() => {
    const currentIds = new Set(subtitles.map((s) => s.id))
    const staleIds = Object.keys(editingCards).filter(
      (id) => !currentIds.has(id)
    )
    if (staleIds.length > 0) {
      setEditingCards((prev) => {
        const next = { ...prev }
        for (const id of staleIds) {
          delete next[id]
        }
        return next
      })
      useSubtitleStore.getState().setEditingSubtitle(null)
    }
  }, [selectedSegmentId, subtitles, editingCards])

  const handleStartEdit = (id: string, text: string) => {
    setEditingCards((prev) => ({
      ...prev,
      [id]: { isEditing: true, text },
    }))
    playerRef.current?.pause()
    useSubtitleStore.getState().setEditingSubtitle(id)
  }

  const handleEditTextChange = (id: string, text: string) => {
    setEditingCards((prev) => {
      const card = prev[id]
      if (!card?.isEditing) return prev
      return { ...prev, [id]: { ...card, text } }
    })
  }

  const handleSaveEdit = (id: string) => {
    if (!activeScene || !activeSegment) return
    const editState = editingCards[id]
    if (!editState) return

    const originalSubtitle = activeSegment.subtitles.find((s) => s.id === id)
    const originalText = originalSubtitle?.text ?? ""
    const newText = editState.text

    if (newText.trim() !== originalText.trim()) {
      stop(id)
      // 记录原始文案，用于 TTS 失败时回退
      pendingRollbackRef.current[id] = originalText
      // 乐观更新：先写文案，再触发 TTS
      updateSubtitle(activeScene.id, activeSegment.id, id, { text: newText })
      submitTts(id, newText)
    } else {
      updateSubtitle(activeScene.id, activeSegment.id, id, { text: newText })
    }

    setEditingCards((prev) => ({
      ...prev,
      [id]: { isEditing: false, text: prev[id]!.text },
    }))
    useSubtitleStore.getState().setEditingSubtitle(null)
  }

  const handleCancelEdit = (id: string) => {
    setEditingCards((prev) => {
      const { [id]: _unused, ...rest } = prev
      void _unused
      return rest
    })
    useSubtitleStore.getState().setEditingSubtitle(null)
  }

  const handleDeleteRequest = (subtitleId: string) => {
    setDeleteTargetId(subtitleId)
  }

  const handleDeleteDismiss = () => {
    setDeleteTargetId(null)
  }

  const handleDeleteConfirm = () => {
    if (!activeScene || !activeSegment || !deleteTargetId) return
    deleteSubtitle(activeScene.id, activeSegment.id, deleteTargetId)
    if (selectedSubtitleId === deleteTargetId) {
      setSelectedSubtitle(null)
    }
    setDeleteTargetId(null)
  }

  const handlePlaySubtitle = (
    e: React.MouseEvent,
    subtitleId: string,
    audioUrl: string
  ) => {
    e.stopPropagation()
    play(subtitleId, audioUrl)
  }

  const handleRegenerate = (subtitleId: string, text: string) => {
    if (isRegenerating(subtitleId)) return
    stop(subtitleId)
    toast.info(`重新生成字幕: ${text.slice(0, 20)}...`)
    submitTts(subtitleId, text)
  }

  const handleCardClick = (subtitle: FeSubtitle) => {
    setSelectedSubtitle(subtitle.id)

    const frameInfo = subtitleFrameMap.get(subtitle.id)
    if (!frameInfo) return

    const midFrame = Math.floor((frameInfo.startFrame + frameInfo.endFrame) / 2)
    const wasPlaying = playerRef.current?.isPlaying() ?? false
    playerRef.current?.pause()
    playerRef.current?.seekTo(midFrame)
    if (wasPlaying) {
      playerRef.current?.play()
    }
  }

  const handleAddAboveFirst = () => {
    if (!activeScene || !activeSegment || subtitles.length === 0) return
    addSubtitle(activeScene.id, activeSegment.id, "above", subtitles[0].id)
  }

  const handleAddBetween = (index: number) => {
    if (!activeScene || !activeSegment) return
    addSubtitle(activeScene.id, activeSegment.id, "below", subtitles[index].id)
  }

  const handleAddBelowLast = () => {
    if (!activeScene || !activeSegment || subtitles.length === 0) return
    addSubtitle(
      activeScene.id,
      activeSegment.id,
      "below",
      subtitles[subtitles.length - 1].id
    )
  }

  const handleAddFirst = () => {
    if (!activeScene || !activeSegment) return
    addSubtitle(activeScene.id, activeSegment.id, "below", null)
  }

  return {
    subtitles,
    activeSegment,
    selectedSubtitleId,
    editingCards,
    deleteTargetId,
    playingId,
    isRegenerating,
    handleStartEdit,
    handleEditTextChange,
    handleSaveEdit,
    handleCancelEdit,
    handleDeleteRequest,
    handleDeleteDismiss,
    handleDeleteConfirm,
    handlePlaySubtitle,
    handleRegenerate,
    handleCardClick,
    handleAddAboveFirst,
    handleAddBetween,
    handleAddBelowLast,
    handleAddFirst,
  }
}
