import type { FeQuestionContent, FeQuestionMetadata } from "@ask2vid/shared"
import { create } from "zustand"

interface QuestionMetadataState {
  metadata: FeQuestionMetadata | null
  questionContent: FeQuestionContent | null

  initialize: (
    metadata: FeQuestionMetadata,
    questionContent?: FeQuestionContent
  ) => void
  reset: () => void
  setTemplateId: (templateId: string | null) => void
}

export const useQuestionMetadataStore = create<QuestionMetadataState>()(
  (set) => ({
    metadata: null,
    questionContent: null,

    initialize: (metadata, questionContent) =>
      set({ metadata, questionContent: questionContent ?? null }),
    reset: () => set({ metadata: null, questionContent: null }),
    setTemplateId: (templateId) =>
      set((state) => {
        if (!state.metadata) return state
        return {
          metadata: {
            ...state.metadata,
            video_synthesis_template_id: templateId,
          },
        }
      }),
  })
)
