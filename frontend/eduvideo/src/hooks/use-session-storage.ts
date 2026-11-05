import { useStorage } from "@/hooks/storage-utils"

export function useSessionStorage(
  key: string,
  initialValue: string
): [value: string, setValue: (value: string) => void] {
  return useStorage(key, initialValue, sessionStorage)
}
