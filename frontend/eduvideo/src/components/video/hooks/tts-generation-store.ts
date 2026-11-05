import { create } from "zustand"

interface TtsGenerationState {
  pendingCount: number
  setCount: (count: number) => void
}

export const useTtsGenerationStore = create<TtsGenerationState>()((set) => ({
  pendingCount: 0,
  setCount: (count) => set({ pendingCount: count }),
}))
