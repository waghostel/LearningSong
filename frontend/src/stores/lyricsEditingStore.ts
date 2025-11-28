import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { MusicStyle, type GenerateSongRequest } from '@/api/songs'
import type { ErrorInfo } from '@/lib/error-utils'

export type GenerationStatus = 
  | 'idle'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'

interface LyricsEditingState {
  // Lyrics state
  originalLyrics: string
  editedLyrics: string
  selectedStyle: MusicStyle
  contentHash: string
  
  // Generation state
  isGenerating: boolean
  taskId: string | null
  songId: string | null  // Same as taskId, exposed for navigation to playback page
  generationStatus: GenerationStatus
  progress: number
  songUrl: string | null
  error: string | null
  errorInfo: ErrorInfo | null
  canRetry: boolean
  lastRequest: GenerateSongRequest | null
  
  // Actions for lyrics
  setOriginalLyrics: (lyrics: string) => void
  setEditedLyrics: (lyrics: string) => void
  setSelectedStyle: (style: MusicStyle) => void
  setContentHash: (hash: string) => void
  
  // Actions for generation
  startGeneration: (taskId: string) => void
  updateProgress: (status: GenerationStatus, progress: number) => void
  completeGeneration: (songUrl: string) => void
  failGeneration: (error: string, retryable: boolean, errorInfo?: ErrorInfo) => void
  reset: () => void
}

const initialState = {
  originalLyrics: '',
  editedLyrics: '',
  selectedStyle: MusicStyle.POP,
  contentHash: '',
  isGenerating: false,
  taskId: null as string | null,
  songId: null as string | null,
  generationStatus: 'idle' as GenerationStatus,
  progress: 0,
  songUrl: null as string | null,
  error: null as string | null,
  errorInfo: null as ErrorInfo | null,
  canRetry: false,
  lastRequest: null as GenerateSongRequest | null,
}

export const useLyricsEditingStore = create<LyricsEditingState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setOriginalLyrics: (lyrics: string) => 
        set({ originalLyrics: lyrics, editedLyrics: lyrics }),
      
      setEditedLyrics: (lyrics: string) => 
        set({ editedLyrics: lyrics }),
      
      setSelectedStyle: (style: MusicStyle) => 
        set({ selectedStyle: style }),
      
      setContentHash: (hash: string) => 
        set({ contentHash: hash }),
      
      startGeneration: (taskId: string) => {
        const state = get()
        set({ 
          isGenerating: true, 
          taskId,
          songId: taskId,  // songId is the same as taskId
          generationStatus: 'queued',
          progress: 0,
          songUrl: null,
          error: null,
          errorInfo: null,
          canRetry: false,
          lastRequest: {
            lyrics: state.editedLyrics,
            style: state.selectedStyle,
            content_hash: state.contentHash,
          }
        })
      },
      
      updateProgress: (status: GenerationStatus, progress: number) => 
        set({ generationStatus: status, progress }),
      
      completeGeneration: (songUrl: string) => 
        set({ 
          isGenerating: false,
          generationStatus: 'completed',
          progress: 100,
          songUrl,
          error: null,
          errorInfo: null,
          canRetry: false,
        }),
      
      failGeneration: (error: string, retryable: boolean, errorInfo?: ErrorInfo) => 
        set({ 
          isGenerating: false,
          generationStatus: 'failed',
          error,
          errorInfo: errorInfo || null,
          canRetry: retryable,
        }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'lyrics-editing-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
