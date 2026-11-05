import { S3Client } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { storageConfig } from "./config.js"
import { logger } from "./lib/logger.js"

const client = new S3Client({
  endpoint: storageConfig.endpoint,
  region: "us-east-1",
  credentials: {
    accessKeyId: storageConfig.accessKey,
    secretAccessKey: storageConfig.secretKey,
  },
  forcePathStyle: true,
})

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function uploadObject(
  localPath: string,
  objectKey: string
): Promise<string> {
  const cleanKey = objectKey.replace(/^\/+/, "")
  const url = `${storageConfig.publicDomain}/${storageConfig.bucket}/${cleanKey}`
  const { size } = await stat(localPath)

  logger.info(
    {
      endpoint: storageConfig.endpoint,
      bucket: storageConfig.bucket,
      key: cleanKey,
      localPath,
      size,
    },
    "uploading to S3"
  )

  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const upload = new Upload({
        client,
        params: {
          Bucket: storageConfig.bucket,
          Key: cleanKey,
          Body: createReadStream(localPath),
          ContentType: "video/mp4",
        },
      })
      await upload.done()
      logger.info({ url, attempt }, "upload complete")
      return url
    } catch (err) {
      logger.error(
        {
          err,
          attempt,
          maxRetries,
          bucket: storageConfig.bucket,
          key: cleanKey,
        },
        "S3 upload failed"
      )
      if (attempt === maxRetries) throw err
      await sleep(2 ** attempt * 1000) // 指数退避: 2s, 4s, 8s
    }
  }

  throw new Error("S3 upload failed after all retries")
}
