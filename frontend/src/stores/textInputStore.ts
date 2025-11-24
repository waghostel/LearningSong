import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PipelineStage = 
  | 'cleaning'
  | 'searching'
  | 'summarizing'
  | 'validating'
  | 'converting'

interface TextInputState {
  content: string
  searchEnabled: boolean
  isGenerating: boolean
  currentStage: PipelineStage | null
  
  setContent: (content: string) => void
  toggleSearch: () => void
  setGenerating: (isGenerating: boolean) => void
  setCurrentStage: (stage: PipelineStage | null) => void
  reset: () => void
}

const initialState = {
  content: '',
  searchEnabled: false,
  isGenerating: false,
  currentStage: null as PipelineStage | null,
}

export const useTextInputStore = create<TextInputState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setContent: (content: string) => set({ content }),
      
      toggleSearch: () => set((state) => ({ searchEnabled: !state.searchEnabled })),
      
      setGenerating: (isGenerating: boolean) => set({ isGenerating }),
      
      setCurrentStage: (stage: PipelineStage | null) => set({ currentStage: stage }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'text-input-storage',
      // Only persist content, not the transient state
      partialize: (state) => ({ content: state.content }),
    }
  )
)
