/**
 * 根据环境生成 API 请求地址。
 * 开发环境返回相对路径（走 Vite proxy），
 * 生产环境返回完整 URL（直接请求后端）。
 */
export function resolveApiUrl(
  devProxyPath: string,
  productionBaseUrl: string,
  productionPathPrefix?: string
): string {
  if (import.meta.env.DEV) {
    return devProxyPath
  }
  const base = productionBaseUrl.replace(/\/+$/, "")
  const prefix = productionPathPrefix
    ? `/${productionPathPrefix.replace(/^\/+/, "")}`
    : ""
  return `${base}${prefix}`
}
