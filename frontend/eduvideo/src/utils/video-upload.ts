import { FilmVideoError } from "@/utils/errors"
import { uploadFile } from "@/utils/upload"

export { FilmVideoError }

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
]

const ALLOWED_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi", ".mkv"]

const MAX_SIZE = 50 * 1024 * 1024 // 50MB

/** 校验视频文件格式和大小 */
export function validateFilmVideo(file: File): void {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
  if (
    !ALLOWED_VIDEO_TYPES.includes(file.type) &&
    !ALLOWED_EXTENSIONS.includes(ext)
  ) {
    throw new FilmVideoError(
      `不支持的视频格式（${file.type || ext}），支持 mp4/webm/mov/avi/mkv`,
      "format"
    )
  }
  if (file.size > MAX_SIZE) {
    throw new FilmVideoError("视频文件不能超过 50MB", "size")
  }
}

export async function uploadFilmVideo(file: File): Promise<string> {
  validateFilmVideo(file)
  return uploadFile(file, file.type || "video/mp4")
}
