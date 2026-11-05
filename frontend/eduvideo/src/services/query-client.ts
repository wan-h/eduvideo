import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

/** 测试用：创建无重试/无超时的 QueryClient */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

/* ── Query Key 工厂 ── */

export const queryKeys = {
  workspace: (params: {
    folderId: string | null
    search: string
    page: number
  }) => ["workspace", params] as const,

  scripts: {
    all: ["scripts"] as const,
    list: (params: { limit: number; offset: number }) =>
      ["scripts", "list", params] as const,
    detail: (taskId: string) => ["scripts", "detail", taskId] as const,
  },

  synthesis: {
    latest: (scriptId: string) => ["synthesis", "latest", scriptId] as const,
    history: (scriptId: string, params: { page: number; pageSize: number }) =>
      ["synthesis", "history", scriptId, params] as const,
  },

  tts: {
    voices: ["tts", "voices"] as const,
    clonedVoices: ["tts", "cloned-voices"] as const,
    editTips: ["tts", "edit-tips"] as const,
  },

  share: {
    videos: ["share", "videos"] as const,
  },

  folders: {
    all: ["folders"] as const,
    list: (search: string) =>
      ["folders", "list", search ? { fuzzy_search: search } : {}] as const,
  },

  questionExtracts: {
    list: ["question-extracts", "list"] as const,
  },
} as const
