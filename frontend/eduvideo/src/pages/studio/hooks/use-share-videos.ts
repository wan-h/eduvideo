import { getShareVideos } from "@/api/eduai/common"
import type { ShareVideoDesc } from "@/api/eduai/common.types"
import { queryKeys } from "@/services/query-client"
import { useQuery } from "@tanstack/react-query"

export function useShareVideos() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.share.videos,
    queryFn: getShareVideos,
  })

  return {
    videos: (data as ShareVideoDesc[]) ?? [],
    isLoading,
    error: error as Error | null,
  }
}
