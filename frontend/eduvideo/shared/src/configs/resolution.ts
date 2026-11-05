/** 支持的分辨率枚举值 */
export type Resolution = "720p" | "1080p" | "2K"

/** resolution → width/height 映射 */
export const RESOLUTION_MAP: Record<
  Resolution,
  { width: number; height: number }
> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "2K": { width: 2560, height: 1440 },
}

/** 根据 resolution 获取宽高 */
export function resolveDimension(resolution: Resolution): {
  width: number
  height: number
} {
  return RESOLUTION_MAP[resolution]
}
