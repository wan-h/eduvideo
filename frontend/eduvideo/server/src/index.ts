import cors from "cors"
import express, {
  type Application,
  type NextFunction,
  type Request,
  type Response,
} from "express"
import { randomUUID } from "node:crypto"
import { pinoHttp } from "pino-http"
import swaggerUi from "swagger-ui-express"
import "./config.js" // 启动期校验 STORAGE_* env vars

import apiRouter from "./api.js"
import { logger } from "./lib/logger.js"
import { generateOpenAPIDoc } from "./openapi.js"

const app: Application = express()
const PORT = process.env.PORT ?? 3000

// Middleware
app.use(cors())
app.use(
  pinoHttp({
    logger,
    genReqId: () => randomUUID(),
    customLogLevel: (res, err) =>
      (res.statusCode ?? 200) >= 400 || err ? "error" : "debug",
  })
)
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true }))

// API routes
app.use("/api", apiRouter)

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(generateOpenAPIDoc()))

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() })
})

// 全局错误处理
app.use(
  (
    err: Error & { status?: number },
    req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    ;(req as Request & { log?: typeof logger }).log?.error(
      { err },
      "unhandled error"
    )
    res.status(err.status || 500).json({ success: false, error: err.message })
  }
)

// 进程级异常防护
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception")
  process.exit(1)
})

process.on("unhandledRejection", (reason) => {
  logger.error(
    {
      reason:
        reason instanceof Error ? (reason.stack ?? reason.message) : reason,
    },
    "unhandled rejection"
  )
})

app.listen(PORT, () => {
  logger.info(`Render server listening on http://localhost:${PORT}`)
  logger.info(`Swagger UI available at http://localhost:${PORT}/api-docs`)
})

export default app
