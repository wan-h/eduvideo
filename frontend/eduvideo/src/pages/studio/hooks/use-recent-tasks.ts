import { listScriptTasks } from "@/api/eduai/script"
import { queryKeys } from "@/services/query-client"
import { useQuery } from "@tanstack/react-query"

interface UseRecentTasksOptions {
  limit?: number
  enabled?: boolean
  intervalMs?: number
}

export function useRecentTasks(options: UseRecentTasksOptions = {}) {
  const { limit = 5, enabled = true, intervalMs = 6000 } = options

  const query = useQuery({
    queryKey: queryKeys.scripts.list({ limit, offset: 0 }),
    queryFn: () => listScriptTasks(limit, 0),
    select: (data) => data.infos,
    enabled,
    refetchInterval: (query) => {
      const tasks = query.state.data?.infos
      if (!tasks) return false
      const hasActive = tasks.some((t) => t.status <= 2)
      return hasActive ? intervalMs : false
    },
  })

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refresh: () => void query.refetch(),
  }
}
