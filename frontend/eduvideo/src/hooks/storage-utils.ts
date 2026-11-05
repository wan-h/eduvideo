import { useCallback, useState } from "react"

const memoryCache = new Map<string, string>()

const STORAGE_PREFIX = "a2v:v1:"

function getStorageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`
}

function readStorage(key: string, fallback: string, storage: Storage): string {
  const storageKey = getStorageKey(key)

  if (memoryCache.has(storageKey)) {
    return memoryCache.get(storageKey)!
  }

  try {
    const stored = storage.getItem(storageKey)
    if (stored !== null) {
      memoryCache.set(storageKey, stored)
      return stored
    }
  } catch {
    // incognito / quota exceeded / disabled
  }

  return fallback
}

function writeStorage(key: string, value: string, storage: Storage): void {
  const storageKey = getStorageKey(key)
  try {
    storage.setItem(storageKey, value)
    memoryCache.set(storageKey, value)
  } catch {
    memoryCache.set(storageKey, value)
  }
}

export function useStorage(
  key: string,
  initialValue: string,
  storage: Storage
): [value: string, setValue: (value: string) => void] {
  const [value, setValue] = useState(() =>
    readStorage(key, initialValue, storage)
  )

  const setStoredValue = useCallback(
    (next: string) => {
      setValue(next)
      writeStorage(key, next, storage)
    },
    [key, storage]
  )

  return [value, setStoredValue]
}
