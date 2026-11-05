import { join } from "node:path"
import pino from "pino"

const isDev = process.env.NODE_ENV !== "production"

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  base: { service: "ask2vid-server" },
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : {
        targets: [
          // 生产环境同时输出到 stdout（容器日志采集）和文件
          {
            target: "pino/file",
            options: { destination: 1 },
          },
          {
            target: "pino-roll",
            options: {
              file: join(process.cwd(), "logs", "app"),
              frequency: "daily",
              mkdir: true,
            },
          },
        ],
      },
})
