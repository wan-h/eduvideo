import { useEffect, useState } from "react"

import { getExportTemplate } from "@/api/eduai/synthesis"
import type { TemplateInfo } from "@/api/eduai/synthesis.types"
import type { RawVideoData } from "@ask2vid/shared"

import {
  toConfigFields,
  useRenderSettingsStore,
} from "@/store/render-settings-store"

interface UseInitTemplateOptions {
  /** 预加载的模板列表。提供时直接匹配，避免额外 API 调用 */
  templates?: TemplateInfo[]
  /** 模板列表是否已加载完成。仅在提供 templates 时需要 */
  templatesReady?: boolean
  /** 模板应用后的回调 */
  onAfterApply?: () => void
}

/**
 * 根据任务数据中的 video_synthesis_template_id 初始化渲染模板。
 *
 * - 提供 templates + templatesReady 时从列表中同步匹配
 * - 未提供 templates 时通过 getExportTemplate API 按 ID 获取
 * - template_id 为空或 API 失败时静默回退到默认值
 */
export function useInitTemplate(
  data: RawVideoData | null | undefined,
  options?: UseInitTemplateOptions
): { ready: boolean } {
  const [ready, setReady] = useState(false)

  const { templates, templatesReady, onAfterApply } = options ?? {}

  const listReady = !templates || templatesReady

  useEffect(() => {
    if (!data || !listReady) return

    const templateId = data.question_metadata.video_synthesis_template_id

    let cancelled = false

    async function init() {
      if (!templateId) {
        if (!cancelled) setReady(true)
        return
      }

      let found: TemplateInfo | undefined

      if (templates) {
        found = templates.find((t) => t.id === templateId)
      } else {
        try {
          const result = await getExportTemplate(templateId)
          found = Array.isArray(result) ? result[0] : result
        } catch {
          // 静默回退
        }
      }

      if (cancelled) return

      if (found) {
        useRenderSettingsStore
          .getState()
          .applyTemplate(found.id, toConfigFields(found.template))
      }

      onAfterApply?.()
      setReady(true)
    }

    init()

    return () => {
      cancelled = true
    }
  }, [data, listReady, templates, onAfterApply])

  return { ready }
}
