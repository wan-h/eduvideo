import { getWorkspace } from "@/api/eduai/workspace"
import type { WorkspaceFolderInfo } from "@/api/eduai/workspace.types"
import { queryKeys } from "@/services/query-client"
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"

const FOLDER_PAGE_SIZE = 20

export interface UseFolderListResult {
  folders: WorkspaceFolderInfo[]
  total: number
  hasMore: boolean
  isLoading: boolean
  isError: boolean
  error: Error | null
  loadMore: () => void
  search: string
  setSearch: (s: string) => void
  refresh: () => void
}

/**
 * 侧边栏文件夹列表 — 搜索 + 无限滚动
 *
 * 基于 useInfiniteQuery，搜索防抖 300ms。
 * 父组件可通过 queryClient.invalidateQueries({ queryKey: ["folders"] }) 触发刷新。
 */
export function useFolderList(): UseFolderListResult {
  const [search, setSearchValue] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const setSearch = useCallback((s: string) => {
    setSearchValue(s)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(s)
    }, 300)
  }, [])

  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  const query = useInfiniteQuery({
    queryKey: queryKeys.folders.list(debouncedSearch),
    queryFn: async ({ pageParam }) => {
      const data = await getWorkspace({
        item_type: "folder",
        fuzzy_search: debouncedSearch || undefined,
        limit: FOLDER_PAGE_SIZE,
        offset: pageParam,
      })
      const items = (data?.items ?? []).filter(
        (item): item is WorkspaceFolderInfo => item.item_type === "folder"
      )
      return { items, total: data?.total ?? 0 }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce(
        (sum, page) => sum + page.items.length,
        0
      )
      return loadedCount < lastPage.total ? loadedCount : undefined
    },
    staleTime: 30_000,
  })

  const queryClient = useQueryClient()

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.folders.all })
  }, [queryClient])

  const folders = query.data?.pages.flatMap((page) => page.items) ?? []
  const total = query.data?.pages[0]?.total ?? 0
  const hasMore = query.hasNextPage

  return {
    folders,
    total,
    hasMore,
    isLoading: query.isLoading,
    isError: !!query.error,
    error: query.error as Error | null,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage()
      }
    },
    search,
    setSearch,
    refresh,
  }
}
