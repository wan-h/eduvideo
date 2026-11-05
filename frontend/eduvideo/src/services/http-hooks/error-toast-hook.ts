import type { AfterResponseHook } from "ky"
import { toast } from "sonner"

/**
 * 处理 >= 400 错误响应的 toast 通知
 *
 * 直接消费响应体提取 message，再重建 Response 返回给调用方。
 * 不用 clone() —— 某些环境下克隆的 body 可能不可读，导致静默失败后回退到 HTTP 状态码文案。
 */
export const errorToastHook: AfterResponseHook = async ({
  request,
  response,
}) => {
  if (response.status >= 400) {
    const pathname = new URL(request.url).pathname
    const toastId = `${request.method}:${pathname}`

    let description: string | undefined
    let bodyText: string | undefined

    try {
      bodyText = await response.text()
      const body = JSON.parse(bodyText) as { message?: string }
      if (body.message) {
        description = body.message
      }
    } catch {
      // 响应体非 JSON 或读取失败，bodyText 维持 undefined
    }

    toast.error("请求失败", {
      id: toastId,
      description: description ?? `HTTP ${response.status}`,
    })

    // 重建 Response 以便下游（ky 的 HTTPError、调用方 catch）仍能读取 body
    if (bodyText !== undefined) {
      return new Response(bodyText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    }
  }
}
