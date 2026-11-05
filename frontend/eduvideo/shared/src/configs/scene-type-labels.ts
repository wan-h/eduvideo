import type { SceneType } from "../utils/schemas"

/** sceneType → 中文 Tab 标签映射 */
export const SCENE_TYPE_LABELS: Record<SceneType, string> = {
  question_introduction: "问题介绍",
  question_solution: "解决方法",
  question_key_points: "关键知识点",
}
