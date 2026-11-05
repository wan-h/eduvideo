"use client"

import { cn } from "@/utils/cn"
import type { SceneType } from "@ask2vid/shared"
import type { PlayerRef } from "@remotion/player"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DeleteConfirmDialog } from "./components/delete-confirm-dialog"
import {
  SegmentEditDialog,
  type SegmentEditDialogConfig,
} from "./components/segment-edit-dialog"
import { SegmentGroup } from "./components/segment-group"
import type { DeleteTarget, EditTarget } from "./hooks/use-segment-editor"
import { useSceneStore } from "./store/scene-store"
import { useSegmentStore } from "./store/segment-store"
import type { SubtitleFrameInfo } from "./utils/scene-frame"

/** sceneType → 固定排序，保证三个内容组顺序稳定 */
const SCENE_ORDER: SceneType[] = [
  "question_introduction",
  "question_solution",
  "question_key_points",
]

/** 根据 sceneType 派生编辑弹窗配置 */
function getDialogConfig(sceneType?: SceneType): SegmentEditDialogConfig {
  return sceneType === "question_introduction"
    ? {
        showTitle: false,
        showOptions: true,
        contentLabel: "内容（题目干）",
        description: "修改内容和选项后点击保存",
      }
    : {
        showTitle: true,
        showOptions: false,
        contentLabel: "内容",
        description: "修改标题和内容后点击保存",
      }
}

export function EditorLeft({
  className,
  playerRef,
  subtitleFrameMap,
  scriptTaskId = "",
}: {
  className?: string
  playerRef: React.RefObject<PlayerRef | null>
  subtitleFrameMap: Map<string, SubtitleFrameInfo>
  scriptTaskId?: string
}) {
  const scenes = useSceneStore((s) => s.scenes)
  const selectedSegmentId = useSceneStore((s) => s.selectedSegmentId)
  const updateSegment = useSegmentStore((s) => s.updateSegment)
  const deleteSegment = useSegmentStore((s) => s.deleteSegment)

  /** 按 SCENE_ORDER 排序后的 scene 列表 */
  const sortedScenes = useMemo(() => {
    return SCENE_ORDER.map((type) =>
      scenes.find((s) => s.sceneType === type)
    ).filter(Boolean) as typeof scenes
  }, [scenes])

  // ── 共享弹窗状态 ──

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const handleStartEdit = useCallback(
    (target: EditTarget) => {
      setEditTarget(target)
      playerRef.current?.pause()
      useSegmentStore.getState().setEditingSegment(true)
    },
    [playerRef]
  )

  const handleStopEdit = useCallback(() => {
    setEditTarget(null)
    useSegmentStore.getState().setEditingSegment(false)
  }, [])

  const handleSaveEdit = useCallback(
    (patch: { title: string; content: string; options?: string[] }) => {
      if (!editTarget) return
      updateSegment(editTarget.sceneId, editTarget.segmentId, patch)
      handleStopEdit()
    },
    [editTarget, updateSegment, handleStopEdit]
  )

  const handleDeleteRequest = useCallback((target: DeleteTarget) => {
    setDeleteTarget(target)
  }, [])

  const handleDeleteDismiss = useCallback(() => {
    setDeleteTarget(null)
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return
    deleteSegment(deleteTarget.sceneId, deleteTarget.segmentId)
    setDeleteTarget(null)
  }, [deleteTarget, deleteSegment])

  /** 正在编辑的场景类型，用于派生弹窗配置 */
  const editingScene = useMemo(() => {
    if (!editTarget) return undefined
    return scenes.find((s) => s.id === editTarget.sceneId)
  }, [editTarget, scenes])

  // ── 自动滚动：选中片段时滚动到可视区域 ──

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedSegmentId) return
    const container = scrollContainerRef.current
    if (!container) return

    const el = container.querySelector(
      `[data-segment-id="${selectedSegmentId}"]`
    )
    if (!el) return

    el.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [selectedSegmentId])

  return (
    <div className={cn("flex h-full flex-col bg-sidebar", className)}>
      <div className="flex h-12 items-center px-4">
        <h2 className="text-sm font-medium text-sidebar-foreground">内容</h2>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3">
        {sortedScenes.map((scene) => (
          <SegmentGroup
            key={scene.id}
            scene={scene}
            playerRef={playerRef}
            subtitleFrameMap={subtitleFrameMap}
            editTarget={editTarget}
            selectedSegmentId={selectedSegmentId}
            onEditStart={handleStartEdit}
            onDeleteRequest={handleDeleteRequest}
          />
        ))}
      </div>

      <div className="min-h-0" />

      <SegmentEditDialog
        key={editTarget?.segmentId}
        open={editTarget !== null}
        onOpenChange={(open) => !open && handleStopEdit()}
        scriptTaskId={scriptTaskId}
        initialData={
          editTarget ?? {
            segmentId: "",
            title: "",
            content: "",
            options: [],
          }
        }
        config={getDialogConfig(editingScene?.sceneType)}
        onSave={handleSaveEdit}
      />

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && handleDeleteDismiss()}
        onConfirm={handleDeleteConfirm}
        title="删除内容"
        description="删除此内容将同时移除其包含的所有字幕，且无法恢复。确定要删除吗？"
      />
    </div>
  )
}
