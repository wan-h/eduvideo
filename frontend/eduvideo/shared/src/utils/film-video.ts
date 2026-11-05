import { parseMedia } from "@remotion/media-parser"

/**
 * 通过 parseMedia 获取远程视频时长（秒）。
 * 失败返回 null，不抛异常 — 调用方自行降级。
 */
export async function getFilmDuration(
  url: string,
  fps: number
): Promise<{ durationInSeconds: number; durationInFrames: number } | null> {
  if (!url) return null
  try {
    const { slowDurationInSeconds } = await parseMedia({
      src: url,
      fields: { slowDurationInSeconds: true },
      acknowledgeRemotionLicense: true,
    })
    if (slowDurationInSeconds <= 0) return null
    return {
      durationInSeconds: slowDurationInSeconds,
      durationInFrames: Math.floor(slowDurationInSeconds * fps),
    }
  } catch {
    return null
  }
}
