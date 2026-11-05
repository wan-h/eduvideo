import { z } from "zod"
import { logger } from "./lib/logger.js"

const StorageEnvSchema = z.object({
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_DOMAIN: z.string().url().optional(),
})

export const storageConfig = (() => {
  const parsed = StorageEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    logger.error({ errors: parsed.error.flatten() }, "Storage config invalid")
    throw new Error("Missing/invalid STORAGE_* env vars")
  }
  return {
    endpoint: parsed.data.STORAGE_ENDPOINT,
    accessKey: parsed.data.STORAGE_ACCESS_KEY,
    secretKey: parsed.data.STORAGE_SECRET_KEY,
    bucket: parsed.data.STORAGE_BUCKET,
    publicDomain: (
      parsed.data.STORAGE_DOMAIN ?? parsed.data.STORAGE_ENDPOINT
    ).replace(/\/+$/, ""),
  }
})()
