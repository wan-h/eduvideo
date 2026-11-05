import {
  useQueryClient,
  type QueryFunction,
  type QueryKey,
} from "@tanstack/react-query"
import { useEffect } from "react"

interface UsePrefetchPageOptions {
  /** 当前页码（0-based） */
  pageIndex: number
  /** 数据总量 */
  total: number
  /** 每页条数 */
  pageSize: number
  /** 当前数据是否为占位数据（placeholderData），是则跳过预请求 */
  isPlaceholderData: boolean
  /** 是否有真实数据（无数据时跳过） */
  hasData: boolean
  /** 构建指定页的 queryKey */
  queryKeyForPage: (pageIndex: number) => QueryKey
  /** 构建指定页的 queryFn */
  queryFnForPage: (pageIndex: number) => QueryFunction
  /** 是否同时预请求上一页（默认 false） */
  prefetchPrevious?: boolean
}

/**
 * 通用分页预请求 hook。
 *
 * 当前页数据就绪后，自动将下一页（可选上一页）静默缓存到 TanStack Query 缓存中，
 * 翻页时命中缓存瞬间切换，消除等待感。
 *
 * 配合 `placeholderData: keepPreviousData` 使用效果最佳——
 * 缓存命中时翻页无闪烁；网络慢时列表半透明降级提示。
 */
export function usePrefetchPage({
  pageIndex,
  total,
  pageSize,
  isPlaceholderData,
  hasData,
  queryKeyForPage,
  queryFnForPage,
  prefetchPrevious = false,
}: UsePrefetchPageOptions) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (isPlaceholderData || !hasData) return

    const totalPages = Math.ceil(total / pageSize)

    // 预请求下一页
    const nextPage = pageIndex + 1
    if (nextPage < totalPages) {
      queryClient.prefetchQuery({
        queryKey: queryKeyForPage(nextPage),
        queryFn: queryFnForPage(nextPage),
      })
    }

    // 可选：预请求上一页
    if (prefetchPrevious) {
      const prevPage = pageIndex - 1
      if (prevPage >= 0) {
        queryClient.prefetchQuery({
          queryKey: queryKeyForPage(prevPage),
          queryFn: queryFnForPage(prevPage),
        })
      }
    }
  }, [
    isPlaceholderData,
    hasData,
    pageIndex,
    total,
    pageSize,
    prefetchPrevious,
    queryKeyForPage,
    queryFnForPage,
    queryClient,
  ])
}
