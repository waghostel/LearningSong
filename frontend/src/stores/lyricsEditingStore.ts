import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { MusicStyle, type GenerateSongRequest, type SongVariation } from '@/api/songs'
import type { ErrorInfo } from '@/lib/error-utils'

// Version limit constants (Requirements: 4.1)
export const MAX_VERSIONS = 10
export const VERSION_LIMIT_WARNING_THRESHOLD = 8

export type GenerationStatus = 
  | 'idle'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'

// Version management interface (Requirements: 1.1, 1.3, 2.2, 5.1, 5.3, 6.1)
export interface LyricsVersion {
  id: string              // UUID v4
  lyrics: string          // Original generated lyrics
  createdAt: Date         // Timestamp of generation
  isEdited: boolean       // Whether user made manual changes
  editedLyrics?: string   // User's edited version (if any)
}

// Helper function to generate UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

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
  
  // Dual song state (Requirements: 4.1, 4.2)
  songVariations: SongVariation[]
  primaryVariationIndex: number
  
  // Version management state (Requirements: 1.1, 1.3, 2.2, 5.1, 5.3, 6.1)
  originalContent: string  // Store for regeneration
  versions: LyricsVersion[]
  activeVersionId: string | null
  isRegenerating: boolean
  regenerationError: string | null
  
  // Version limit state (Requirements: 4.1)
  getIsApproachingVersionLimit: () => boolean
  getVersionCount: () => number
  
  // Actions for lyrics
  setOriginalLyrics: (lyrics: string) => void
  setEditedLyrics: (lyrics: string) => void
  setSelectedStyle: (style: MusicStyle) => void
  setContentHash: (hash: string) => void
  
  // Actions for generation
  startGeneration: (taskId: string) => void
  updateProgress: (status: GenerationStatus, progress: number) => void
  completeGeneration: (songUrl: string, variations?: SongVariation[]) => void
  failGeneration: (error: string, retryable: boolean, errorInfo?: ErrorInfo) => void
  reset: () => void
  
  // Actions for dual songs (Requirements: 4.1, 4.2)
  setSongVariations: (variations: SongVariation[]) => void
  setPrimaryVariationIndex: (index: number) => void
  
  // Actions for version management (Requirements: 1.1, 1.3, 2.2, 5.1, 5.3, 6.1)
  addVersion: (lyrics: string) => void
  setActiveVersion: (versionId: string) => void
  deleteVersion: (versionId: string) => void
  updateVersionEdits: (versionId: string, editedLyrics: string) => void
  setOriginalContent: (content: string) => void
  
  // Actions for regeneration (Requirements: 1.1, 1.3, 1.4)
  startRegeneration: () => void
  completeRegeneration: (lyrics: string) => void
  failRegeneration: (error: string) => void
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
  songVariations: [] as SongVariation[],
  primaryVariationIndex: 0,
  // Version management initial state
  originalContent: '',
  versions: [] as LyricsVersion[],
  activeVersionId: null as string | null,
  isRegenerating: false,
  regenerationError: null as string | null,
}

export const useLyricsEditingStore = create<LyricsEditingState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Version limit getters (Requirements: 4.1)
      getIsApproachingVersionLimit: () => get().versions.length >= VERSION_LIMIT_WARNING_THRESHOLD,
      getVersionCount: () => get().versions.length,
      
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
      
      completeGeneration: (songUrl: string, variations?: SongVariation[]) => 
        set({ 
          isGenerating: false,
          generationStatus: 'completed',
          progress: 100,
          songUrl,
          songVariations: variations || [],
          primaryVariationIndex: 0, // Default to first variation
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
      
      setSongVariations: (variations: SongVariation[]) => 
        set({ songVariations: variations }),
      
      setPrimaryVariationIndex: (index: number) => 
        set({ primaryVariationIndex: index }),
      
      // Version management actions (Requirements: 1.1, 1.3, 2.2, 5.1, 5.3, 6.1)
      addVersion: (lyrics: string) => {
        const state = get()
        const newVersion: LyricsVersion = {
          id: generateUUID(),
          lyrics,
          createdAt: new Date(),
          isEdited: false,
        }
        
        // Limit to MAX_VERSIONS, auto-delete oldest if needed (Requirements: 4.1)
        let updatedVersions = [...state.versions, newVersion]
        if (updatedVersions.length > MAX_VERSIONS) {
          // Sort by createdAt and remove the oldest
          updatedVersions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          updatedVersions = updatedVersions.slice(1)
        }
        
        set({
          versions: updatedVersions,
          activeVersionId: newVersion.id,
          originalLyrics: lyrics,
          editedLyrics: lyrics,
        })
      },
      
      setActiveVersion: (versionId: string) => {
        const state = get()
        const version = state.versions.find(v => v.id === versionId)
        if (!version) return
        
        // Save current edits to previous active version before switching (Requirements: 5.3)
        const currentActiveVersion = state.versions.find(v => v.id === state.activeVersionId)
        let updatedVersions = state.versions
        if (currentActiveVersion && state.editedLyrics !== currentActiveVersion.lyrics) {
          updatedVersions = state.versions.map(v => 
            v.id === state.activeVersionId 
              ? { ...v, isEdited: true, editedLyrics: state.editedLyrics }
              : v
          )
        }
        
        // Load selected version's lyrics (Requirements: 5.4)
        const lyricsToLoad = version.editedLyrics || version.lyrics
        
        set({
          versions: updatedVersions,
          activeVersionId: versionId,
          originalLyrics: version.lyrics,
          editedLyrics: lyricsToLoad,
        })
      },
      
      deleteVersion: (versionId: string) => {
        const state = get()
        // Don't delete if only one version remains (Requirements: 6.4)
        if (state.versions.length <= 1) return
        
        const updatedVersions = state.versions.filter(v => v.id !== versionId)
        
        // If deleting active version, switch to most recent remaining (Requirements: 6.3)
        let newActiveVersionId = state.activeVersionId
        let newOriginalLyrics = state.originalLyrics
        let newEditedLyrics = state.editedLyrics
        
        if (versionId === state.activeVersionId) {
          // Find the most recent version by createdAt
          const sortedVersions = [...updatedVersions].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          const newActiveVersion = sortedVersions[0]
          if (newActiveVersion) {
            newActiveVersionId = newActiveVersion.id
            newOriginalLyrics = newActiveVersion.lyrics
            newEditedLyrics = newActiveVersion.editedLyrics || newActiveVersion.lyrics
          }
        }
        
        set({
          versions: updatedVersions,
          activeVersionId: newActiveVersionId,
          originalLyrics: newOriginalLyrics,
          editedLyrics: newEditedLyrics,
        })
      },
      
      updateVersionEdits: (versionId: string, editedLyrics: string) => {
        const state = get()
        const version = state.versions.find(v => v.id === versionId)
        if (!version) return
        
        const isEdited = editedLyrics !== version.lyrics
        
        set({
          versions: state.versions.map(v => 
            v.id === versionId 
              ? { ...v, isEdited, editedLyrics: isEdited ? editedLyrics : undefined }
              : v
          ),
          editedLyrics,
        })
      },
      
      setOriginalContent: (content: string) => {
        const state = get()
        // Clear version history when content changes (Requirements: 4.4)
        if (content !== state.originalContent) {
          set({
            originalContent: content,
            versions: [],
            activeVersionId: null,
          })
        }
      },
      
      // Regeneration actions (Requirements: 1.1, 1.3, 1.4)
      startRegeneration: () => {
        set({
          isRegenerating: true,
          regenerationError: null,
        })
      },
      
      completeRegeneration: (lyrics: string) => {
        const state = get()
        const newVersion: LyricsVersion = {
          id: generateUUID(),
          lyrics,
          createdAt: new Date(),
          isEdited: false,
        }
        
        // Limit to MAX_VERSIONS (Requirements: 4.1)
        let updatedVersions = [...state.versions, newVersion]
        if (updatedVersions.length > MAX_VERSIONS) {
          updatedVersions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          updatedVersions = updatedVersions.slice(1)
        }
        
        set({
          isRegenerating: false,
          regenerationError: null,
          versions: updatedVersions,
          activeVersionId: newVersion.id,
          originalLyrics: lyrics,
          editedLyrics: lyrics,
        })
      },
      
      failRegeneration: (error: string) => {
        set({
          isRegenerating: false,
          regenerationError: error,
        })
      },
      
      reset: () => set(initialState),
    }),
    {
      name: 'lyrics-editing-storage',
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          try {
            return sessionStorage.getItem(name)
          } catch (error) {
            console.warn('Failed to read from sessionStorage:', error)
            return null
          }
        },
        setItem: (name: string, value: string) => {
          try {
            sessionStorage.setItem(name, value)
          } catch (error) {
            // Handle QuotaExceededError gracefully (Requirements: 4.1)
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
              console.warn('sessionStorage quota exceeded. State will not be persisted.')
              // Try to clear oldest data to make room
              try {
                sessionStorage.removeItem(name)
                sessionStorage.setItem(name, value)
              } catch {
                // If still failing, just warn and continue without persistence
                console.warn('Unable to persist state even after clearing storage.')
              }
            } else {
              console.warn('Failed to write to sessionStorage:', error)
            }
          }
        },
        removeItem: (name: string) => {
          try {
            sessionStorage.removeItem(name)
          } catch (error) {
            console.warn('Failed to remove from sessionStorage:', error)
          }
        },
      })),
    }
  )
)
