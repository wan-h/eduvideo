import { getHomeDisplayInfo } from "@/api/eduai/common"
import type { DisplayInfoDesc } from "@/api/eduai/common.types"
import { useEffect, useState } from "react"

// 模块级缓存：多个组件调用 useHomeDisplayInfo 只发一次请求
let cachedPromise: Promise<DisplayInfoDesc> | null = null
let cachedData: DisplayInfoDesc | null = null

interface HomeDisplayInfoState {
  data: DisplayInfoDesc | null
  isLoading: boolean
}

/**
 * 获取首页展示信息（通知、上传提示、placeholder）。
 *
 * 模块级缓存去重 — 多个消费组件独立调用，共享同一请求结果。
 * 页面 mount 时 fetch 一次，失败静默隐藏面板。
 */
export function useHomeDisplayInfo(): HomeDisplayInfoState {
  const [state, setState] = useState<HomeDisplayInfoState>({
    data: cachedData,
    isLoading: !cachedData,
  })

  useEffect(() => {
    if (cachedData) return

    if (!cachedPromise) {
      cachedPromise = getHomeDisplayInfo()
    }

    let cancelled = false
    cachedPromise
      .then((result) => {
        if (!cancelled) {
          cachedData = result
          setState({ data: result, isLoading: false })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ data: null, isLoading: false })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
