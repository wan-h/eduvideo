import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { errorToastHook } from "./error-toast-hook"

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}))

describe("errorToastHook", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows the shared error toast and rebuilds the response", async () => {
    const request = new Request("https://example.com/api/demo/other", {
      method: "POST",
    })
    const response = new Response(
      JSON.stringify({ code: 50000, message: "server error" }),
      { status: 500 }
    )

    const rebuiltResponse = await errorToastHook({
      request,
      response,
    } as Parameters<typeof errorToastHook>[0])

    expect(toast.error).toHaveBeenCalledWith("请求失败", {
      id: "POST:/api/demo/other",
      description: "server error",
    })
    expect(rebuiltResponse).toBeInstanceOf(Response)
    if (!(rebuiltResponse instanceof Response)) {
      throw new Error("Expected the hook to rebuild the response")
    }
    await expect(rebuiltResponse.json()).resolves.toMatchObject({
      code: 50000,
    })
  })
})