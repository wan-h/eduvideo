import { listQuestionExtracts } from "@/api/eduai/question-extract"
import type { QuestionExtractConfirmInfo } from "@/api/eduai/question-extract.types"
import { queryKeys } from "@/services/query-client"
import { useQuery } from "@tanstack/react-query"

export interface UsePendingConfirmsOptions {
  /** 暂停轮询（如 dialog 打开时），不影响手动 refresh */
  paused?: boolean
}

export interface UsePendingConfirmsResult {
  items: QuestionExtractConfirmInfo[]
  isLoading: boolean
  isRefetching: boolean
  refresh: () => void
}

export function usePendingConfirms(
  _options: UsePendingConfirmsOptions = {}
): UsePendingConfirmsResult {
  const query = useQuery({
    queryKey: queryKeys.questionExtracts.list,
    queryFn: listQuestionExtracts,
    refetchInterval: false,
  })

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isFetching && !query.isLoading,
    refresh: () => void query.refetch(),
  }
}
