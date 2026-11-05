import { cloneDeep, isEqual } from "lodash-es"
import { create } from "zustand"

export interface DirtyTrackerState<T> {
  cleanSnapshot: T | null

  initialize: (data: T) => void
  isDirty: (current: T) => boolean
  markClean: (current: T) => void
  reset: () => T | null
  skipDirtyTracking: (current: T) => void
}

export const useDirtyTracker = create<DirtyTrackerState<unknown>>()(
  (set, get) => ({
    cleanSnapshot: null,

    initialize: (data) => set({ cleanSnapshot: cloneDeep(data) }),

    isDirty: (current) => {
      const { cleanSnapshot } = get()
      if (!cleanSnapshot) return false
      return !isEqual(current, cleanSnapshot)
    },

    markClean: (current) => set({ cleanSnapshot: cloneDeep(current) }),

    reset: () => {
      const { cleanSnapshot } = get()
      return cleanSnapshot ? cloneDeep(cleanSnapshot) : null
    },

    skipDirtyTracking: (current) => set({ cleanSnapshot: cloneDeep(current) }),
  })
)
