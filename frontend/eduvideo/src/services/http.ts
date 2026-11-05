import { resolveApiUrl } from "@/utils/api-url"
import ky from "ky"
import { errorToastHook, requestIdHook } from "./http-hooks"

export const api = ky.create({
  timeout: 30000,
  credentials: "include",
  hooks: {
    beforeRequest: [requestIdHook],
    afterResponse: [errorToastHook],
  },
})

export const baseApi = api.extend({
  prefix: resolveApiUrl("/base", import.meta.env.VITE_BASE_API),
})

const eduaiApiPrefix = import.meta.env.VITE_EDUAI_API_PREFIX ?? "education-ai-dev"
const eduaiApiPath = `/api/${eduaiApiPrefix}`

export const eduaiApi = api.extend({
  // 开发环境走 Vite 代理；生产环境为 {VITE_BASE_API}/api/{prefix}
  prefix: resolveApiUrl(
    eduaiApiPath,
    import.meta.env.VITE_BASE_API,
    eduaiApiPath
  ),
})
