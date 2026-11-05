"use client"

import { cn } from "@/utils/cn"
import type { FeScene, SceneType } from "@ask2vid/shared"
import { MdRenderer, ZERO_WIDTH_PATTERN } from "@ask2vid/shared"
import type { PlayerRef } from "@remotion/player"
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  ListChecks,
} from "lucide-react"
import type { ComponentType } from "react"
import { Fragment, useEffect, useState } from "react"
import type { DeleteTarget, EditTarget } from "../hooks/use-segment-editor"
import { useSegmentEditor } from "../hooks/use-segment-editor"
import { useSceneStore } from "../store/scene-store"
import type { SubtitleFrameInfo } from "../utils/scene-frame"
import { CardActionButtons } from "./card-action-buttons"
import { CardBanner } from "./card-banner"
import { EmptyStatePlaceholder } from "./empty-state-placeholder"
import { InsertIndicator } from "./insert-indicator"

/** 内容组配置：标题 + icon */
const GROUP_CONFIG: Record<
  SceneType,
  { label: string; Icon: ComponentType<{ className?: string }> }
> = {
  question_introduction: { label: "题干", Icon: BookOpen },
  question_solution: { label: "解题思路", Icon: Lightbulb },
  question_key_points: { label: "总结", Icon: ListChecks },
}

interface SegmentGroupProps {
  scene: FeScene
  playerRef: React.RefObject<PlayerRef | null>
  subtitleFrameMap: Map<string, SubtitleFrameInfo>
  /** 当前编辑目标（来自 EditorLeft 共享弹窗），用于"编辑中"横幅 */
  editTarget: EditTarget | null
  /** 全局选中 segmentId，用于卡片高亮 */
  selectedSegmentId: string | null
  /** 触发编辑弹窗（携带 sceneId） */
  onEditStart: (target: EditTarget) => void
  /** 触发删除确认（携带 sceneId） */
  onDeleteRequest: (target: DeleteTarget) => void
}

/** 内容组：折叠横条 + 展开后的内容卡片列表 */
export function SegmentGroup({
  scene,
  playerRef,
  subtitleFrameMap,
  editTarget,
  selectedSegmentId,
  onEditStart,
  onDeleteRequest,
}: SegmentGroupProps) {
  const [collapsed, setCollapsed] = useState(false)

  // 播放过程中 selectedSegmentId 变化且属于当前组时自动展开
  // 通过 Zustand subscribe 监听变化，setState 在回调中调用，不会触发 effect 规则
  // 暂停时 selectedSegmentId 不变，用户可自由折叠/展开
  useEffect(() => {
    const sceneId = scene.id
    const unsubscribe = useSceneStore.subscribe((state, prevState) => {
      const current = state.selectedSegmentId
      const previous = prevState?.selectedSegmentId
      if (!current || current === previous) return
      const targetScene = state.scenes.find((s) => s.id === sceneId)
      if (!targetScene) return
      const belongsToGroup = targetScene.segments.some(
        (seg) => seg.id === current
      )
      if (belongsToGroup) {
        setCollapsed(false)
      }
    })
    return unsubscribe
  }, [scene.id])

  const config = GROUP_CONFIG[scene.sceneType]
  const Icon = config.Icon
  const isIntro = scene.sceneType === "question_introduction"

  const editor = useSegmentEditor(scene.id, playerRef, subtitleFrameMap)

  return (
    <div className="mb-3">
      {/* 折叠横条 */}
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border bg-sidebar px-3 py-2.5 transition-colors hover:bg-accent"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{config.label}</span>
          {!collapsed && editor.segments.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {editor.segments.length}
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronRight className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {/* 卡片列表 */}
      {!collapsed && (
        <div className="mt-0 flex flex-col">
          {editor.segments.length === 0 && !isIntro ? (
            <EmptyStatePlaceholder
              label="添加新片段"
              onClick={editor.handleAddFirst}
            />
          ) : (
            <>
              {isIntro && <div className="h-4" />}
              {!isIntro && (
                <InsertIndicator
                  label="添加新片段"
                  onClick={editor.handleAddAboveFirst}
                />
              )}
              {editor.segments.map((segment, index) => (
                <Fragment key={segment.id}>
                  <div
                    data-segment-id={segment.id}
                    className={cn(
                      "group relative scroll-my-4 overflow-hidden rounded-lg border bg-card transition-all duration-150 select-none",
                      selectedSegmentId === segment.id && "ring-2 ring-brand"
                    )}
                    style={{ aspectRatio: editor.aspectRatio }}
                    onClick={() => editor.handleCardClick(segment)}
                  >
                    <div className="p-2">
                      {segment.title.replace(ZERO_WIDTH_PATTERN, "").trim() && (
                        <div className="mb-1 truncate border-b pb-1 text-base font-medium text-card-foreground">
                          <MdRenderer
                            content={segment.title}
                            mode="preview"
                            fontSize={16}
                          />
                        </div>
                      )}
                      {segment.content && (
                        <div className="mt-0.5 text-muted-foreground">
                          <MdRenderer
                            content={segment.content}
                            mode="preview"
                            fontSize={14}
                          />
                        </div>
                      )}
                      {isIntro &&
                        segment.options &&
                        segment.options.filter((o) => o.trim()).length > 0 && (
                          <div className="mt-1 text-muted-foreground/80">
                            {segment.options
                              .filter((o) => o.trim())
                              .map((option, i) => (
                                <MdRenderer
                                  key={i}
                                  content={option}
                                  mode="preview"
                                  fontSize={13}
                                />
                              ))}
                          </div>
                        )}
                    </div>

                    {segment.subtitles.length > 0 && (
                      <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-6 bg-gradient-to-t from-card to-transparent" />
                    )}

                    {editTarget?.segmentId === segment.id ? (
                      <CardBanner text="编辑中" variant="info" />
                    ) : segment.subtitles.length === 0 ? (
                      <CardBanner text="暂无字幕,请先添加字幕" />
                    ) : null}

                    <CardActionButtons
                      visibility={
                        selectedSegmentId === segment.id ? "visible" : "hidden"
                      }
                      onEdit={() =>
                        onEditStart({
                          sceneId: scene.id,
                          segmentId: segment.id,
                          title: segment.title,
                          content: segment.content,
                          options: segment.options,
                        })
                      }
                      onDelete={() =>
                        onDeleteRequest({
                          sceneId: scene.id,
                          segmentId: segment.id,
                        })
                      }
                      onSelect={() => editor.handleCardClick(segment)}
                      showDelete={!isIntro}
                    />
                  </div>
                  {!isIntro &&
                    (index < editor.segments.length - 1 ? (
                      <InsertIndicator
                        label="添加新片段"
                        onClick={() => editor.handleAddBetween(index)}
                      />
                    ) : (
                      <InsertIndicator
                        label="添加新片段"
                        onClick={editor.handleAddBelowLast}
                      />
                    ))}
                </Fragment>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
