import { describe, expect, it } from "vitest"
import { queryClient, queryKeys } from "../query-client"

describe("queryClient", () => {
  it("has correct default staleTime", () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(30_000)
  })

  it("has correct default gcTime", () => {
    expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(300_000)
  })

  it("has refetchOnWindowFocus enabled", () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(
      true
    )
  })

  it("has retry=1", () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(1)
  })
})

describe("queryKeys", () => {
  it("scripts.all is a flat array", () => {
    expect(queryKeys.scripts.all).toEqual(["scripts"])
  })

  it("scripts.detail includes taskId", () => {
    expect(queryKeys.scripts.detail("abc-123")).toEqual([
      "scripts",
      "detail",
      "abc-123",
    ])
  })

  it("workspace includes folderId/search/page", () => {
    expect(
      queryKeys.workspace({ folderId: "f1", search: "foo", page: 0 })
    ).toEqual(["workspace", { folderId: "f1", search: "foo", page: 0 }])
  })
})

describe("queryKeys.folders", () => {
  it("list 无搜索词时不含 fuzzy_search", () => {
    expect(queryKeys.folders.list("")).toEqual(["folders", "list", {}])
  })

  it("list 有搜索词时包含 fuzzy_search", () => {
    expect(queryKeys.folders.list("数学")).toEqual([
      "folders",
      "list",
      { fuzzy_search: "数学" },
    ])
  })

  it("all 返回 folders 前缀", () => {
    expect(queryKeys.folders.all).toEqual(["folders"])
  })
})
