import { getWorkspace } from "@/api/eduai/workspace"
import type { WorkspaceItem } from "@/api/eduai/workspace.types"
import { usePrefetchPage } from "@/hooks/use-prefetch-page"
import { queryKeys } from "@/services/query-client"
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router"

export interface UseWorkspaceResult {
  items: WorkspaceItem[]
  total: number
  folderName: string
  error: Error | null
  pageIndex: number
  setPageIndex: (index: number) => void
  pageSize: number
  refresh: () => Promise<void>
  isInitialLoading: boolean
  isRefetching: boolean
  isPlaceholderData: boolean
  folderId: string | null
  search: string
  setSearch: (s: string) => void
  navigateToFolder: (id: string | null) => void
}

export function useWorkspace(pageSize: number): UseWorkspaceResult {
  const [searchParams, setSearchParams] = useSearchParams()
  const folderId = searchParams.get("fid") || null
  const search = searchParams.get("q") || ""

  const [pageIndex, setPageIndex] = useState(0)
  const prevFolderId = useRef(folderId)

  useEffect(() => {
    if (prevFolderId.current !== folderId) {
      prevFolderId.current = folderId
      setPageIndex(0)
    }
  }, [folderId])

  const query = useQuery({
    queryKey: queryKeys.workspace({ folderId, search, page: pageIndex }),
    queryFn: () =>
      getWorkspace({
        item_type: "script",
        folder_id: folderId,
        fuzzy_search: search || undefined,
        limit: pageSize,
        offset: pageIndex * pageSize,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const items = query.state.data?.items
      if (!items) return false
      const hasActive = items.some(
        (i) => i.item_type === "script" && i.status <= 2
      )
      return hasActive ? 6000 : false
    },
  })

  // 预请求下一页：当前页数据就绪后静默缓存下一页，翻页时瞬间切换
  usePrefetchPage({
    pageIndex,
    total: query.data?.total ?? 0,
    pageSize,
    isPlaceholderData: query.isPlaceholderData,
    hasData: !!query.data,
    queryKeyForPage: (page) => queryKeys.workspace({ folderId, search, page }),
    queryFnForPage: (page) => () =>
      getWorkspace({
        item_type: "script",
        folder_id: folderId,
        fuzzy_search: search || undefined,
        limit: pageSize,
        offset: page * pageSize,
      }),
  })

  const queryClient = useQueryClient()

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["workspace"],
      predicate: (q) => {
        const p = q.queryKey[1] as {
          folderId: string | null
          search: string
          page: number
        }
        return p.folderId === folderId && p.search === search
      },
    })
  }, [queryClient, folderId, search])

  const setSearch = useCallback(
    (s: string) => {
      setSearchParams((prev) => {
        if (s) prev.set("q", s)
        else prev.delete("q")
        return prev
      })
    },
    [setSearchParams]
  )

  const navigateToFolder = useCallback(
    (id: string | null) => {
      setSearchParams((prev) => {
        if (id) prev.set("fid", id)
        else prev.delete("fid")
        return prev
      })
    },
    [setSearchParams]
  )

  return {
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    folderName: query.data?.folder_name ?? "",
    error: query.error as Error | null,
    pageIndex,
    setPageIndex,
    pageSize,
    refresh,
    isInitialLoading: query.isLoading,
    isRefetching: query.isFetching && !query.isLoading,
    isPlaceholderData: query.isPlaceholderData,
    folderId,
    search,
    setSearch,
    navigateToFolder,
  }
}
