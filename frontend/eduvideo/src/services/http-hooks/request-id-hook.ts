import { useAuthStore } from "@/store/auth-store"
import type { BeforeRequestHook } from "ky"
import { v7 as uuidv7 } from "uuid"

/**
 * 为每个请求注入 request-id、user-id 和 accept-language 请求头
 *
 * request-id: uuid v7，用于后端链路追踪
 * user-id: 当前用户 uid（固定为内置 admin）
 * accept-language: 当前应用选中的语言 ("en" 或 "zh-CN")
 */
export const requestIdHook: BeforeRequestHook = ({ request }) => {
  request.headers.set("request-id", uuidv7())
  const uid = useAuthStore.getState().userInfo.uid
  request.headers.set("user-id", uid)
  const lang =
    window.localStorage.getItem("app-language") === "en" ? "en" : "zh-CN"
  request.headers.set("accept-language", lang)
}
