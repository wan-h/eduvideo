import { eduaiApi } from "@/services/http"
import type { ApiResponse } from "./shared"
import type {
  UploadPresignedUrlParams,
  UploadPresignedUrlResult,
} from "./storage.types"

/** 生成资源上传预签名 URL */
export async function getUploadPresignedUrl(
  params: UploadPresignedUrlParams
): Promise<UploadPresignedUrlResult> {
  const searchParams: Record<string, string> = {
    file_name: params.file_name,
  }
  if (params.content_type) searchParams.content_type = params.content_type
  if (params.tag) searchParams.tag = params.tag

  const { data } = await eduaiApi
    .get("/storage/v0/upload/presigned_url", { searchParams })
    .json<ApiResponse<UploadPresignedUrlResult>>()
  return data
}
