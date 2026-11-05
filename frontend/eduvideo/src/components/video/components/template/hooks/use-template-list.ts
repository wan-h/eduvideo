import { useCallback, useState } from "react"
import { toast } from "sonner"

import {
  deleteExportTemplate,
  listExportTemplates,
  updateExportTemplate,
} from "@/api/eduai/synthesis"
import type { TemplateInfo } from "@/api/eduai/synthesis.types"
import {
  DEFAULT_TEMPLATE_CONFIG,
  DEFAULT_TEMPLATE_ID,
  type VideoConfigFields,
} from "@/store/render-settings-store"

import type { TemplateItemData } from "./types"

interface UseTemplateListOptions {
  applyDraftTemplate: (id: string, config: VideoConfigFields) => void
  draftActiveTemplateId: string | null
  setTemplates: (tpls: TemplateInfo[]) => void
  onRefreshTemplates: () => void
}

export function useTemplateList({
  applyDraftTemplate,
  draftActiveTemplateId,
  setTemplates,
  onRefreshTemplates,
}: UseTemplateListOptions) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const handleSelectTemplate = useCallback(
    (item: TemplateItemData) => {
      if (item.id === draftActiveTemplateId) return
      applyDraftTemplate(item.id, item.config)
    },
    [draftActiveTemplateId, applyDraftTemplate]
  )

  const handleRename = useCallback(
    async (tplId: string) => {
      if (!editName.trim()) return
      try {
        await updateExportTemplate(tplId, {
          name: editName.trim(),
          template: null,
        })
        toast.success("模板已更新")
        setEditingId(null)
        setEditName("")
        const tpls = await listExportTemplates()
        setTemplates(tpls)
        onRefreshTemplates()
      } catch {
        toast.error("更新模板失败")
      }
    },
    [editName, setTemplates, onRefreshTemplates]
  )

  const handleDelete = useCallback(
    async (tplId: string, name: string) => {
      try {
        await deleteExportTemplate(tplId)
        toast.success(`模板「${name}」已删除`)
        if (draftActiveTemplateId === tplId) {
          applyDraftTemplate(DEFAULT_TEMPLATE_ID, DEFAULT_TEMPLATE_CONFIG)
        }
        // 不在此处修改 formal store —— 若被删模板已应用，
        // 待 dialog 关闭时由 TemplatePanel 静默回退到默认模板
        const tpls = await listExportTemplates()
        setTemplates(tpls)
        onRefreshTemplates()
      } catch {
        toast.error("删除模板失败")
      }
    },
    [
      draftActiveTemplateId,
      applyDraftTemplate,
      setTemplates,
      onRefreshTemplates,
    ]
  )

  return {
    editingId,
    editName,
    setEditingId,
    setEditName,
    handleSelectTemplate,
    handleRename,
    handleDelete,
  }
}
