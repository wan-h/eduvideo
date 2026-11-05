import { isHTTPError } from "ky"
import { useCallback, useState } from "react"
import { toast } from "sonner"

import type { VideoExportDesc } from "@/api/eduai/shared"
import {
  createExportTemplate,
  listExportTemplates,
  updateExportTemplate,
} from "@/api/eduai/synthesis"
import type { TemplateInfo } from "@/api/eduai/synthesis.types"
import {
  toConfigFields,
  type VideoConfigFields,
} from "@/store/render-settings-store"

interface UseTemplateSaveOptions {
  draftSettings: VideoConfigFields
  draftActiveTemplateId: string | null
  draftLastTemplateId: string
  nameMap: Record<string, string>
  configMap: Record<string, VideoConfigFields>
  setTemplates: (tpls: TemplateInfo[]) => void
  onRefreshTemplates: () => void
  applyDraftTemplate: (id: string, config: VideoConfigFields) => void
}

export function useTemplateSave({
  draftSettings,
  draftActiveTemplateId,
  draftLastTemplateId,
  nameMap,
  configMap,
  setTemplates,
  onRefreshTemplates,
  applyDraftTemplate,
}: UseTemplateSaveOptions) {
  const [saveAsName, setSaveAsName] = useState("")
  const [saveAsError, setSaveAsError] = useState("")
  const [creatingNew, setCreatingNew] = useState(false)
  const [updateError, setUpdateError] = useState("")

  const isDirty = draftActiveTemplateId === null

  const handleCancelSaveAs = useCallback(() => {
    if (isDirty) {
      const config = configMap[draftLastTemplateId]
      if (config) {
        applyDraftTemplate(draftLastTemplateId, config)
      }
    }
    setSaveAsName("")
    setSaveAsError("")
    setCreatingNew(false)
  }, [isDirty, configMap, draftLastTemplateId, applyDraftTemplate])

  const handleDiscardEdit = useCallback(() => {
    const config = configMap[draftLastTemplateId]
    if (config) {
      applyDraftTemplate(draftLastTemplateId, config)
    }
    setUpdateError("")
  }, [configMap, draftLastTemplateId, applyDraftTemplate])

  const handleUpdateTemplate = useCallback(async () => {
    setUpdateError("")
    const desc: VideoExportDesc = {
      resolution: draftSettings.resolution,
      background: draftSettings.background,
      opening_film: draftSettings.opening_film,
      closing_film: draftSettings.closing_film,
      watermark: draftSettings.watermark,
      fps: draftSettings.fps,
      page_layout: draftSettings.page_layout,
    }
    try {
      await updateExportTemplate(draftLastTemplateId, {
        name: null,
        template: desc,
      })
      const name = nameMap[draftLastTemplateId] ?? "模板"
      toast.success(`模板「${name}」已更新`)
      applyDraftTemplate(draftLastTemplateId, { ...draftSettings })
      const tpls = await listExportTemplates()
      setTemplates(tpls)
      onRefreshTemplates()
    } catch (err: unknown) {
      let msg = "更新模板失败"
      if (isHTTPError(err)) {
        const body = err.data as { message?: string } | undefined
        if (body?.message) msg = body.message
      }
      setUpdateError(msg)
    }
  }, [
    draftSettings,
    draftLastTemplateId,
    nameMap,
    applyDraftTemplate,
    setTemplates,
    onRefreshTemplates,
  ])

  const handleSaveAs = useCallback(async () => {
    const name = saveAsName.trim()
    if (!name) return
    if (name === "默认") {
      setSaveAsError("模板名称不能为「默认」")
      return
    }
    setSaveAsError("")
    const desc: VideoExportDesc = {
      resolution: draftSettings.resolution,
      background: draftSettings.background,
      opening_film: draftSettings.opening_film,
      closing_film: draftSettings.closing_film,
      watermark: draftSettings.watermark,
      fps: draftSettings.fps,
      page_layout: draftSettings.page_layout,
    }
    try {
      const result = await createExportTemplate({ name, template: desc })
      const newTpl = result?.[result.length - 1]
      toast.success(`模板「${name}」已保存`)
      setSaveAsName("")
      setCreatingNew(false)
      const tpls = await listExportTemplates()
      setTemplates(tpls)
      onRefreshTemplates()
      if (newTpl) {
        applyDraftTemplate(newTpl.id, toConfigFields(newTpl.template))
      }
    } catch (err: unknown) {
      let msg = "保存模板失败"
      if (isHTTPError(err)) {
        const body = err.data as { message?: string } | undefined
        if (body?.message) msg = body.message
      }
      setSaveAsError(msg)
    }
  }, [
    saveAsName,
    draftSettings,
    setTemplates,
    onRefreshTemplates,
    applyDraftTemplate,
  ])

  const handleNewClick = useCallback(() => {
    setCreatingNew(true)
    setSaveAsName("")
    setSaveAsError("")
    setUpdateError("")
  }, [])

  return {
    saveAsName,
    saveAsError,
    creatingNew,
    updateError,
    setSaveAsName,
    setSaveAsError,
    handleCancelSaveAs,
    handleDiscardEdit,
    handleUpdateTemplate,
    handleSaveAs,
    handleNewClick,
  }
}
