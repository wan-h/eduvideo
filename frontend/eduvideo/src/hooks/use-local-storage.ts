import { useStorage } from "@/hooks/storage-utils"

export function useLocalStorage(
  key: string,
  initialValue: string
): [value: string, setValue: (value: string) => void] {
  return useStorage(key, initialValue, localStorage)
}
