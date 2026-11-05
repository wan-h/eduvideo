import type { BackgroundType } from "../utils/types"

/** 枚举值 → 文件名映射 */
export const BACKGROUND_IMAGE_MAP: Record<BackgroundType, string> = {
  default: "bg-blackboard-1.png",
  blackboard2: "bg-blackboard-2.png",
  gray: "bg-gray.png",
}

/** 默认背景 */
export const DEFAULT_BACKGROUND: BackgroundType = "default"

/** UI 选择器选项 */
export const BACKGROUNDS: readonly {
  label: string
  value: BackgroundType
}[] = [
  { value: "default", label: "黑板 1" },
  { value: "blackboard2", label: "黑板 2" },
  { value: "gray", label: "灰色" },
]
