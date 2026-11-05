"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/utils/cn"
import type { PlayerRef } from "@remotion/player"
import { Fragment } from "react"
import { CardActionButtons } from "./components/card-action-buttons"
import { CardBanner } from "./components/card-banner"
import { DeleteConfirmDialog } from "./components/delete-confirm-dialog"
import { EditTipsBanner } from "./components/edit-tips-banner"
import { EditTipsToggleButton } from "./components/edit-tips-toggle-button"
import { EmptyStatePlaceholder } from "./components/empty-state-placeholder"
import { InsertIndicator } from "./components/insert-indicator"
import { SubtitleAudioIndicator } from "./components/subtitle-audio-indicator"
import { useEditTips } from "./hooks/use-edit-tips"
import { useEditTipsDismissed } from "./hooks/use-edit-tips-dismissed"
import { useSubtitleEditor } from "./hooks/use-subtitle-editor"
import type { SubtitleFrameInfo } from "./utils/scene-frame"

import { useLanguage } from "@/i18n/language-provider"

export function EditorRight({
  className,
  playerRef,
  subtitleFrameMap,
  scriptId,
}: {
  className?: string
  playerRef: React.RefObject<PlayerRef | null>
  subtitleFrameMap: Map<string, SubtitleFrameInfo>
  scriptId: string
}) {
  const { translate } = useLanguage()
  const editor = useSubtitleEditor(playerRef, subtitleFrameMap, scriptId)
  const { tips, isLoading, error } = useEditTips()
  const [dismissed, setDismissed] = useEditTipsDismissed()

  const hasTips = !error && !isLoading && tips && tips.length > 0
  const showBanner = !dismissed && hasTips

  return (
    <div className={cn("flex h-full flex-col bg-sidebar", className)}>
      <div className="flex h-12 items-center px-4">
        <h2 className="flex-1 text-sm font-medium text-sidebar-foreground">
          {translate("字幕")}
        </h2>
        {dismissed && hasTips && (
          <EditTipsToggleButton onClick={() => setDismissed(false)} />
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* 编辑小技巧 banner — 仅数据就绪且未关闭时展示 */}
        {showBanner && (
          <EditTipsBanner
            tips={tips!}
            onDismiss={() => setDismissed(true)}
            className="mb-3"
          />
        )}

        {editor.subtitles.length > 0 ? (
          <div className="flex flex-col">
            <InsertIndicator
              label={translate("添加新字幕")}
              onClick={editor.handleAddAboveFirst}
            />
            {editor.subtitles.map((subtitle, index) => (
              <Fragment key={subtitle.id}>
                <div
                  className={cn(
                    "group relative rounded-lg border bg-card p-3",
                    !editor.editingCards[subtitle.id]?.isEditing && "pb-10",
                    editor.selectedSubtitleId === subtitle.id &&
                      "ring-2 ring-brand"
                  )}
                  onClick={() => editor.handleCardClick(subtitle)}
                >
                  {editor.editingCards[subtitle.id]?.isEditing ? (
                    <CardBanner text={translate("编辑中")} variant="info" />
                  ) : subtitle.text.trim() === "" ? (
                    <CardBanner text={translate("请添加字幕内容")} />
                  ) : null}

                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <SubtitleAudioIndicator
                        audio={subtitle.audio}
                        duration={subtitle.duration}
                        isRegenerating={editor.isRegenerating(subtitle.id)}
                        isPlaying={editor.playingId === subtitle.id}
                        onPlay={(e) =>
                          editor.handlePlaySubtitle(
                            e,
                            subtitle.id,
                            subtitle.audio
                          )
                        }
                      />
                    </div>
                    {editor.editingCards[subtitle.id]?.isEditing ? (
                      <div className="mt-0.5">
                        <Textarea
                          value={editor.editingCards[subtitle.id].text}
                          onChange={(e) =>
                            editor.handleEditTextChange(
                              subtitle.id,
                              e.target.value
                            )
                          }
                          className="min-h-[60px] w-full text-sm"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => editor.handleCancelEdit(subtitle.id)}
                          >
                            {translate("取消")}
                          </Button>
                          <Button
                            size="xs"
                            variant="default"
                            onClick={() => editor.handleSaveEdit(subtitle.id)}
                          >
                            {translate("保存")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-sm text-card-foreground">
                        {subtitle.text}
                      </p>
                    )}
                  </div>

                  {!editor.editingCards[subtitle.id]?.isEditing && (
                    <CardActionButtons
                      visibility={
                        editor.selectedSubtitleId === subtitle.id
                          ? "visible"
                          : "hidden"
                      }
                      onEdit={() =>
                        editor.handleStartEdit(subtitle.id, subtitle.text)
                      }
                      onDelete={() => editor.handleDeleteRequest(subtitle.id)}
                      onRegenerate={(text) =>
                        editor.handleRegenerate(subtitle.id, text)
                      }
                      regenerateText={subtitle.text}
                      onSelect={() => editor.handleCardClick(subtitle)}
                      showRegenerate
                      isRegenerating={editor.isRegenerating(subtitle.id)}
                    />
                  )}
                </div>
                {index < editor.subtitles.length - 1 ? (
                  <InsertIndicator
                    label={translate("添加新字幕")}
                    onClick={() => editor.handleAddBetween(index)}
                  />
                ) : (
                  <InsertIndicator
                    label={translate("添加新字幕")}
                    onClick={editor.handleAddBelowLast}
                  />
                )}
              </Fragment>
            ))}
          </div>
        ) : editor.activeSegment ? (
          <EmptyStatePlaceholder
            label={translate("添加新字幕")}
            onClick={editor.handleAddFirst}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {translate("请先在左侧选择一个内容")}
            </p>
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        open={editor.deleteTargetId !== null}
        onOpenChange={(open) => !open && editor.handleDeleteDismiss()}
        onConfirm={editor.handleDeleteConfirm}
        title={translate("删除字幕")}
        description={translate("删除此字幕将同时移除其对应的音频，且无法恢复。确定要删除吗？")}
      />
    </div>
  )
}
