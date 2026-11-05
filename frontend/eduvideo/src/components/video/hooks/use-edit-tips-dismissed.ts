import { useLocalStorage } from "@/hooks/use-local-storage"

const STORAGE_KEY = "edit-tips:dismissed"

/**
 * 编辑小技巧 banner 的关闭状态持久化 hook。
 *
 * - `true`：用户点击 × 关闭 banner，后续不再展示
 * - `false`：banner 正常展示
 */
export function useEditTipsDismissed(): [
  dismissed: boolean,
  setDismissed: (value: boolean) => void,
] {
  const [raw, setRaw] = useLocalStorage(STORAGE_KEY, "false")
  const dismissed = raw === "true"

  const setDismissed = (value: boolean) => setRaw(value ? "true" : "false")

  return [dismissed, setDismissed]
}
