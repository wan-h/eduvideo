import { useState } from "react"
import { toast } from "sonner"

import { updateScriptTaskResult } from "@/api/eduai/script"
import { useDirtyTracker } from "@/components/video/store/dirty-tracker"
import { useQuestionMetadataStore } from "@/components/video/store/question-metadata-store"
import { useSceneStore } from "@/components/video/store/scene-store"
import { feToData } from "@ask2vid/shared"

export function useSaveScriptTask(taskId: string | undefined) {
  const [isSaving, setIsSaving] = useState(false)

  const save = async () => {
    if (!taskId) {
      toast.error("任务 ID 缺失")
      return
    }

    setIsSaving(true)

    try {
      const scenes = useSceneStore.getState().scenes
      const metadata = useQuestionMetadataStore.getState().metadata
      const questionContent =
        useQuestionMetadataStore.getState().questionContent
      if (!metadata || !questionContent) {
        throw new Error("数据未初始化，无法保存")
      }
      const data = feToData({
        scenes,
        questionMetadata: metadata,
        questionContent,
      })
      const result = JSON.stringify(data)

      await updateScriptTaskResult(taskId, { script: result })

      useDirtyTracker
        .getState()
        .markClean({ scenes, questionMetadata: metadata, questionContent })
      toast.success("保存成功")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "保存失败，请稍后重试"
      toast.error(message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  return { save, isSaving }
}
