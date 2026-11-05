import { useVideoConfig } from "remotion"

const BASE_HEIGHT = 1080

/**
 * 返回基于 1080p 设计稿的缩放系数。
 * 所有固定 px 值乘以此系数即可适配任意分辨率（720p/1080p/2K）。
 */
export function useResolutionScale(): number {
  const { height } = useVideoConfig()
  return height / BASE_HEIGHT
}
