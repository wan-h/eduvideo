import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useShallow } from "zustand/shallow"

import { listExportTemplates } from "@/api/eduai/synthesis"
import type { TemplateInfo } from "@/api/eduai/synthesis.types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useDirtyTracker } from "@/components/video/store/dirty-tracker"
import { useQuestionMetadataStore } from "@/components/video/store/question-metadata-store"
import { useSceneStore } from "@/components/video/store/scene-store"
import { hasDraftDiff, useDraftStore } from "@/store/draft-store"
import {
  DEFAULT_TEMPLATE_CONFIG,
  DEFAULT_TEMPLATE_ID,
  toConfigFields,
  useRenderSettingsStore,
} from "@/store/render-settings-store"

import { ConfigEditor } from "./config-editor"
import {
  useTemplateList,
  useTemplateSave,
  type TemplateItemData,
} from "./hooks"
import { SaveAsAlert } from "./save-as-alert"
import { TemplateListSidebar } from "./template-list-sidebar"
import { UpdateAlert } from "./update-alert"

interface TemplatePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefreshTemplates: () => void
  initialTemplate?: TemplateItemData | null
  onApplyTemplate?: () => void
}

export { type TemplateItemData } from "./hooks"

export function TemplatePanel({
  open,
  onOpenChange,
  onRefreshTemplates,
  initialTemplate,
  onApplyTemplate,
}: TemplatePanelProps) {
  /* ── 正式 store（用于差异比较和 commit）── */
  const formalState = useRenderSettingsStore(
    useShallow((s) => ({
      resolution: s.resolution,
      background: s.background,
      opening_film: s.opening_film,
      closing_film: s.closing_film,
      watermark: s.watermark,
      fps: s.fps,
      page_layout: s.page_layout,
      activeTemplateId: s.activeTemplateId,
      lastAppliedTemplateId: s.lastAppliedTemplateId,
    }))
  )
  const commitFromDraft = useRenderSettingsStore((s) => s.commitFromDraft)

  /* ── 草稿 store ── */
  const draftConfig = useDraftStore((s) => s.config)
  const openDraft = useDraftStore((s) => s.openDraft)
  const closeDraft = useDraftStore((s) => s.closeDraft)
  const applyDraftTemplate = useDraftStore((s) => s.applyTemplate)
  const setDraftFps = useDraftStore((s) => s.setFps)
  const setDraftResolution = useDraftStore((s) => s.setResolution)
  const setDraftOpeningFilm = useDraftStore((s) => s.setOpeningFilm)
  const setDraftClosingFilm = useDraftStore((s) => s.setClosingFilm)
  const setDraftWatermark = useDraftStore((s) => s.setWatermark)
  const setDraftBackground = useDraftStore((s) => s.setBackground)
  const setDraftPageLayout = useDraftStore((s) => s.setPageLayout)

  const [templates, setTemplates] = useState<TemplateInfo[]>([])

  /* ── 打开/关闭时管理草稿生命周期 ── */
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        // 如果正式层应用的模板已被删除，静默回退到默认模板
        const formalId = useRenderSettingsStore.getState().activeTemplateId
        if (formalId && formalId !== DEFAULT_TEMPLATE_ID) {
          const exists = templates.some((t) => t.id === formalId)
          if (!exists) {
            useRenderSettingsStore
              .getState()
              .applyTemplate(DEFAULT_TEMPLATE_ID, DEFAULT_TEMPLATE_CONFIG)
            const currentScenes = useSceneStore.getState().scenes
            const currentMetadata = useQuestionMetadataStore.getState().metadata
            const currentContent =
              useQuestionMetadataStore.getState().questionContent
            if (currentMetadata && currentContent) {
              useDirtyTracker.getState().skipDirtyTracking({
                scenes: currentScenes,
                questionMetadata: currentMetadata,
                questionContent: currentContent,
              })
            }
          }
        }
        closeDraft()
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange, closeDraft, templates]
  )

  const prevOpenRef = useRef(open)
  useEffect(() => {
    if (open) {
      if (!prevOpenRef.current) {
        listExportTemplates()
          .then(setTemplates)
          .catch(() => toast.error("加载模板列表失败"))
      }
      openDraft({
        resolution: formalState.resolution,
        background: formalState.background,
        opening_film: formalState.opening_film,
        closing_film: formalState.closing_film,
        watermark: formalState.watermark,
        fps: formalState.fps,
        page_layout: formalState.page_layout,
        activeTemplateId: formalState.activeTemplateId,
        lastAppliedTemplateId:
          formalState.activeTemplateId ?? DEFAULT_TEMPLATE_ID,
      })
    }
    prevOpenRef.current = open
  }, [open, openDraft, formalState])

  /* ── 模板列表（默认 + 初始模板 + API，去重）── */
  const mergedItems = useMemo<TemplateItemData[]>(() => {
    const apiItems: TemplateItemData[] = templates.map((tpl) => ({
      id: tpl.id,
      name: tpl.name,
      config: toConfigFields(tpl.template),
      isDefault: false,
    }))

    const defaultItem: TemplateItemData = {
      id: DEFAULT_TEMPLATE_ID,
      name: "默认",
      config: DEFAULT_TEMPLATE_CONFIG,
      isDefault: true,
    }

    if (initialTemplate && initialTemplate.id !== DEFAULT_TEMPLATE_ID) {
      const filteredApi = apiItems.filter((it) => it.id !== initialTemplate.id)
      return [defaultItem, initialTemplate, ...filteredApi]
    }

    return [defaultItem, ...apiItems]
  }, [templates, initialTemplate])

  const configMap = useMemo(
    () => Object.fromEntries(mergedItems.map((it) => [it.id, it.config])),
    [mergedItems]
  )

  const nameMap = useMemo(
    () => Object.fromEntries(mergedItems.map((it) => [it.id, it.name])),
    [mergedItems]
  )

  /* ── 草稿派生值 ── */
  const draftActiveTemplateId = draftConfig?.activeTemplateId ?? null
  const draftLastTemplateId =
    draftConfig?.lastAppliedTemplateId ?? DEFAULT_TEMPLATE_ID
  const isDirty = draftConfig !== null && draftConfig.activeTemplateId === null
  const isEditingTemplate =
    isDirty && draftLastTemplateId !== DEFAULT_TEMPLATE_ID

  const selectedItem = mergedItems.find(
    (it) =>
      it.id ===
      (draftConfig?.activeTemplateId ?? draftConfig?.lastAppliedTemplateId)
  )

  /* ── 差异检测（「应用模板」按钮 disabled）── */
  const hasDiff = draftConfig !== null && hasDraftDiff(draftConfig, formalState)

  /* ── 草稿配置快照 ── */
  const draftSettings = useMemo(
    () =>
      draftConfig
        ? {
            fps: draftConfig.fps,
            resolution: draftConfig.resolution,
            opening_film: draftConfig.opening_film,
            closing_film: draftConfig.closing_film,
            watermark: draftConfig.watermark,
            background: draftConfig.background,
            page_layout: draftConfig.page_layout,
          }
        : {
            fps: formalState.fps,
            resolution: formalState.resolution,
            opening_film: formalState.opening_film,
            closing_film: formalState.closing_film,
            watermark: formalState.watermark,
            background: formalState.background,
            page_layout: formalState.page_layout,
          },
    [draftConfig, formalState]
  )

  /* ── Hooks ── */
  const templateList = useTemplateList({
    applyDraftTemplate,
    draftActiveTemplateId,
    setTemplates,
    onRefreshTemplates,
  })

  const templateSave = useTemplateSave({
    draftSettings,
    draftActiveTemplateId,
    draftLastTemplateId,
    nameMap,
    configMap,
    setTemplates,
    onRefreshTemplates,
    applyDraftTemplate,
  })

  const editingTemplateName = nameMap[draftLastTemplateId] ?? ""

  /* ── 应用模板（桥接草稿 store → 正式 store，触发保存）── */
  const handleApply = useCallback(() => {
    if (!draftConfig) return
    commitFromDraft(draftConfig)
    closeDraft()
    onOpenChange(false)
    toast.success("模板已应用")
    onApplyTemplate?.()
  }, [draftConfig, commitFromDraft, closeDraft, onOpenChange, onApplyTemplate])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className="sm:max-w-3xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isDirty ? "另存为模板" : "模板配置"}</DialogTitle>
        </DialogHeader>

        {isEditingTemplate && !templateSave.creatingNew && (
          <UpdateAlert
            templateName={editingTemplateName}
            updateError={templateSave.updateError}
            onUpdate={templateSave.handleUpdateTemplate}
            onDiscard={() => {
              templateSave.handleDiscardEdit()
            }}
          />
        )}

        {(templateSave.creatingNew || (isDirty && !isEditingTemplate)) && (
          <SaveAsAlert
            saveAsName={templateSave.saveAsName}
            saveAsError={templateSave.saveAsError}
            onSaveAsNameChange={templateSave.setSaveAsName}
            onSaveAsErrorClear={() => templateSave.setSaveAsError("")}
            onSave={templateSave.handleSaveAs}
            onCancel={() => {
              templateSave.handleCancelSaveAs()
            }}
          />
        )}

        <div className="flex max-h-[70vh] gap-4">
          <TemplateListSidebar
            items={mergedItems}
            selectedItemId={selectedItem?.id}
            hasApiTemplates={templates.length > 0}
            editingId={templateList.editingId}
            editName={templateList.editName}
            onNewClick={templateSave.handleNewClick}
            onSelectTemplate={templateList.handleSelectTemplate}
            onStartRename={(id, name) => {
              templateList.setEditingId(id)
              templateList.setEditName(name)
            }}
            onCancelRename={() => {
              templateList.setEditingId(null)
              templateList.setEditName("")
            }}
            onSaveRename={templateList.handleRename}
            onDelete={templateList.handleDelete}
            onEditNameChange={templateList.setEditName}
          />

          <div className="-mr-4 flex-1 space-y-3 overflow-y-auto pr-4">
            <h4 className="text-xs font-medium text-muted-foreground">
              配置详情
            </h4>
            <ConfigEditor
              key={selectedItem?.id}
              currentSettings={draftSettings}
              setFps={setDraftFps}
              setResolution={setDraftResolution}
              setOpeningFilm={setDraftOpeningFilm}
              setClosingFilm={setDraftClosingFilm}
              setWatermark={setDraftWatermark}
              setBackground={setDraftBackground}
              setPageLayout={setDraftPageLayout}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="brand"
            onClick={handleApply}
            disabled={!hasDiff || isDirty || templateSave.creatingNew}
          >
            {isDirty || templateSave.creatingNew ? "请先完成编辑" : "应用模板"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
