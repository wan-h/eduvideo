import type { ProxyOptions } from "vite"

interface ProxyLoggerEvents {
  proxyReq?: boolean
  proxyRes?: boolean
  error?: boolean
  devOnly?: boolean
}

/**
 * 创建代理日志配置，用于调试代理请求/响应/错误信息
 */
export function createProxyLogger(
  mode: string,
  events: ProxyLoggerEvents = {}
): ProxyOptions["configure"] {
  const {
    proxyReq = false,
    proxyRes = false,
    error = false,
    devOnly = true,
  } = events
  if (devOnly && mode !== "development") return () => {}
  return (proxy, options) => {
    if (proxyReq) {
      proxy.on("proxyReq", (proxyReq, req) => {
        console.log(
          `[PROXY:CLIENT] ${req.method}: ${options.target}${proxyReq.path}`
        )
      })
    }
    if (proxyRes) {
      proxy.on("proxyRes", (proxyRes, req) => {
        console.log(
          `[PROXY:SERVER] ${req.method}: ${options.target} -> ${proxyRes.statusCode}`
        )
      })
    }
    if (error) {
      proxy.on("error", (err, req) => {
        console.error(
          `[PROXY:ERROR] ${req.method}: ${options.target} -> ${err.message}`
        )
      })
    }
  }
}
