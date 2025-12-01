import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  MusicStyle,
  type SongDetails,
  type ShareLinkResponse,
  type SongVariation,
  getSongDetails,
  getSharedSong,
  createShareLink as apiCreateShareLink,
} from '@/api/songs'
import type { AlignedWord } from '@/types/lyrics'

interface SongPlaybackState {
  // Song data
  songId: string | null
  songUrl: string | null
  lyrics: string
  style: MusicStyle | null
  createdAt: Date | null
  expiresAt: Date | null
  isOwner: boolean

  // Dual song state (Requirements: 4.1, 4.2)
  songVariations: SongVariation[]
  primaryVariationIndex: number

  // Timestamped lyrics data
  alignedWords: AlignedWord[]
  hasTimestamps: boolean
  waveformData: number[]

  // Playback state
  isPlaying: boolean
  currentTime: number
  duration: number
  isLoading: boolean
  error: string | null

  // Share state
  shareUrl: string | null
  isSharing: boolean

  // Actions
  loadSong: (songId: string) => Promise<void>
  loadSharedSong: (shareToken: string) => Promise<void>
  setPlaybackState: (isPlaying: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  createShareLink: () => Promise<string>
  reset: () => void
  
  // Actions for dual songs (Requirements: 4.1, 4.2)
  setSongVariations: (variations: SongVariation[]) => void
  setPrimaryVariationIndex: (index: number) => void
}


const initialState = {
  songId: null as string | null,
  songUrl: null as string | null,
  lyrics: '',
  style: null as MusicStyle | null,
  createdAt: null as Date | null,
  expiresAt: null as Date | null,
  isOwner: false,
  // Dual song state
  songVariations: [] as SongVariation[],
  primaryVariationIndex: 0,
  // Timestamped lyrics data
  alignedWords: [] as AlignedWord[],
  hasTimestamps: false,
  waveformData: [] as number[],
  // Playback state
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  isLoading: false,
  error: null as string | null,
  shareUrl: null as string | null,
  isSharing: false,
}

// Helper to map API response to store state
const mapSongDetailsToState = (details: SongDetails) => ({
  songId: details.song_id,
  songUrl: details.song_url,
  lyrics: details.lyrics,
  style: details.style,
  createdAt: new Date(details.created_at),
  expiresAt: new Date(details.expires_at),
  isOwner: details.is_owner,
  // Dual song fields
  songVariations: details.variations ?? [],
  primaryVariationIndex: details.primary_variation_index ?? 0,
  // Timestamped lyrics fields
  alignedWords: details.aligned_words ?? [],
  hasTimestamps: details.has_timestamps ?? false,
  waveformData: details.waveform_data ?? [],
})

export const useSongPlaybackStore = create<SongPlaybackState>()(
  persist(
    (set, get) => ({
      ...initialState,

      loadSong: async (songId: string) => {
        set({ isLoading: true, error: null })
        try {
          const details = await getSongDetails(songId)
          set({
            ...mapSongDetailsToState(details),
            isLoading: false,
            error: null,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to load song'
          set({ isLoading: false, error: message })
          throw err
        }
      },

      loadSharedSong: async (shareToken: string) => {
        set({ isLoading: true, error: null })
        try {
          const details = await getSharedSong(shareToken)
          set({
            ...mapSongDetailsToState(details),
            isLoading: false,
            error: null,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to load shared song'
          set({ isLoading: false, error: message })
          throw err
        }
      },

      setPlaybackState: (isPlaying: boolean) => set({ isPlaying }),

      setCurrentTime: (time: number) => set({ currentTime: time }),

      setDuration: (duration: number) => set({ duration }),

      createShareLink: async () => {
        const { songId } = get()
        if (!songId) {
          throw new Error('No song loaded')
        }

        set({ isSharing: true })
        try {
          const response: ShareLinkResponse = await apiCreateShareLink(songId)
          set({ shareUrl: response.share_url, isSharing: false })
          return response.share_url
        } catch (err) {
          set({ isSharing: false })
          throw err
        }
      },

      setSongVariations: (variations: SongVariation[]) => 
        set({ songVariations: variations }),
      
      setPrimaryVariationIndex: (index: number) => 
        set({ primaryVariationIndex: index }),

      reset: () => set(initialState),
    }),
    {
      name: 'song-playback-storage',
      storage: createJSONStorage(() => sessionStorage),
      // Only persist song data, not playback state
      partialize: (state) => ({
        songId: state.songId,
        songUrl: state.songUrl,
        lyrics: state.lyrics,
        style: state.style,
        createdAt: state.createdAt,
        expiresAt: state.expiresAt,
        isOwner: state.isOwner,
        shareUrl: state.shareUrl,
        // Dual song fields
        songVariations: state.songVariations,
        primaryVariationIndex: state.primaryVariationIndex,
        // Timestamped lyrics fields
        alignedWords: state.alignedWords,
        hasTimestamps: state.hasTimestamps,
        waveformData: state.waveformData,
      }),
    }
  )
)
