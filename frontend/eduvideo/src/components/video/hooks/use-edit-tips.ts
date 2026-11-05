import { getEditTips } from "@/api/eduai/tts"
import type { EditTips } from "@/api/eduai/tts.types"
import { useLanguage } from "@/i18n/language-provider"
import { useEffect, useState } from "react"

interface EditTipsState {
  tips: EditTips | null
  /** 加载中（初次 fetch） */
  isLoading: boolean
  /** 请求失败 */
  error: boolean
}

/**
 * 获取字幕编辑提示列表。
 *
 * 页面挂载及语言切换时 fetch
 */
export function useEditTips(): EditTipsState {
  const [state, setState] = useState<EditTipsState>({
    tips: null,
    isLoading: true,
    error: false,
  })
  const { language } = useLanguage()

  useEffect(() => {
    let cancelled = false

    getEditTips()
      .then((tips) => {
        if (!cancelled) {
          setState({ tips, isLoading: false, error: false })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ tips: null, isLoading: false, error: true })
        }
      })

    return () => {
      cancelled = true
    }
  }, [language])

  return state
}
