import { getUploadPresignedUrl } from "@/api/eduai/storage"
import ky from "ky"

/**
 * 将文件上传到 OSS，返回最终可访问的 URL。
 *
 * 流程：获取预签名 URL → PUT 上传 → 返回去参 URL。
 * 用纯 ky（不用 api 实例），避免 requestIdHook 注入额外请求头破坏 V4 签名。
 */
export async function uploadFile(
  file: File,
  contentType?: string
): Promise<string> {
  const { upload_url, public_url, content_type } = await getUploadPresignedUrl({
    file_name: file.name,
    content_type: contentType || file.type || "application/octet-stream",
  })

  await ky.put(upload_url, {
    body: file,
    headers: { "Content-Type": content_type },
    timeout: false,
  })

  return public_url
}
