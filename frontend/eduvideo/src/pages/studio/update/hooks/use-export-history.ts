import { useState } from "react"

import type { BackgroundType } from "@ask2vid/shared"
import { BACKGROUND_IMAGE_MAP, DEFAULT_BACKGROUND } from "@ask2vid/shared"

import type { TaskStatusEnum } from "@/api/eduai/shared"
import { listSynthesisTasks } from "@/api/eduai/synthesis"
import type { SynthesisTaskInfo } from "@/api/eduai/synthesis.types"
import { queryKeys } from "@/services/query-client"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

export type ExportRecordStatus =
  "pending" | "processing" | "completed" | "failed"

export interface ExportRecord {
  id: string
  status: ExportRecordStatus
  progress: number
  createdAt: string
  videoUrl: string
  /** 失败时的错误信息 */
  message?: string
}

const API_STATUS_MAP: Record<TaskStatusEnum, ExportRecordStatus> = {
  0: "pending",
  1: "processing",
  2: "processing",
  3: "pending",
  4: "processing",
  10: "completed",
  20: "failed",
  30: "failed",
}

const PAGE_SIZE = 10
const POLL_INTERVAL_MS = 6000

function formatDateTime(value: string): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

function mapItem(item: SynthesisTaskInfo): ExportRecord {
  return {
    id: item.id,
    status: API_STATUS_MAP[item.status] ?? "pending",
    progress: item.progress ?? 0,
    createdAt: formatDateTime(item.created_at ?? ""),
    videoUrl: item.video_url ?? "",
    message: item.message,
  }
}

export function isValidBackgroundType(value: string): value is BackgroundType {
  return value in BACKGROUND_IMAGE_MAP
}

export function toBackgroundType(value: string | undefined): BackgroundType {
  if (value && isValidBackgroundType(value)) return value
  return DEFAULT_BACKGROUND
}

export function useLatestExportRecord(scriptId: string) {
  const query = useQuery({
    queryKey: queryKeys.synthesis.latest(scriptId),
    queryFn: () => listSynthesisTasks(scriptId, 1, 0),
    select: (data) => (data.infos.length > 0 ? mapItem(data.infos[0]) : null),
    enabled: !!scriptId,
    refetchInterval: (query) => {
      if (!query.state.data) return false
      // query.state.data is the pre-select data: { infos, total }
      const items = query.state.data.infos
      if (!items || items.length === 0) return false
      const status = API_STATUS_MAP[items[0].status]
      return status === "pending" || status === "processing"
        ? POLL_INTERVAL_MS
        : false
    },
  })

  return {
    latestRecord: query.data ?? null,
    loading: query.isLoading,
    error: query.error as Error | null,
    refresh: () => void query.refetch(),
  }
}

export function useExportHistory(scriptId: string, enabled: boolean) {
  const [pageIndex, setPageIndex] = useState(0)

  const query = useQuery({
    queryKey: queryKeys.synthesis.history(scriptId, {
      page: pageIndex,
      pageSize: PAGE_SIZE,
    }),
    queryFn: () =>
      listSynthesisTasks(scriptId, PAGE_SIZE, pageIndex * PAGE_SIZE),
    enabled: enabled && !!scriptId,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      if (!query.state.data) return false
      const items = query.state.data.infos
      if (!items) return false
      const hasActive = items.some((item) => {
        const status = API_STATUS_MAP[item.status]
        return status === "pending" || status === "processing"
      })
      return hasActive ? POLL_INTERVAL_MS : false
    },
  })

  const records = query.data?.infos.map(mapItem) ?? []
  const total = query.data?.total ?? 0

  return {
    records,
    total,
    error: query.error as Error | null,
    pageIndex,
    setPageIndex,
    pageSize: PAGE_SIZE,
    refresh: () => void query.refetch(),
    isInitialLoading: query.isLoading,
    isRefetching: query.isFetching && !query.isLoading,
  }
}
