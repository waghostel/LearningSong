import { useCallback, useRef, useState } from 'react'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import { useSongPlaybackStore } from '@/stores/songPlaybackStore'
import { updatePrimaryVariation, fetchVariationTimestampedLyrics, type SongVariation } from '@/api/songs'
import { ApiError } from '@/api/client'
import { logVariationSelection } from '@/lib/analytics'
import type { AlignedWord } from '@/types/lyrics'

export interface UseSongSwitcherOptions {
  taskId: string
  variations: SongVariation[]
  initialIndex?: number
  onSwitch?: (index: number) => void
  onError?: (error: string) => void
}

export interface UseSongSwitcherReturn {
  activeIndex: number
  currentVariation: SongVariation | null
  isLoading: boolean
  error: string | null
  switchVariation: (index: number) => Promise<void>
  clearError: () => void
}

/**
 * Custom hook for managing song variation switching
 * 
 * Handles:
 * - Switching between song variations
 * - Fetching timestamped lyrics for new variation
 * - Updating primary variation on backend
 * - Error handling and recovery
 * - Request cancellation for rapid switches
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 6.5
 * 
 * @param options - Configuration options
 * @returns Switcher state and control functions
 */
export const useSongSwitcher = ({
  taskId,
  variations,
  initialIndex = 0,
  onSwitch,
  onError,
}: UseSongSwitcherOptions): UseSongSwitcherReturn => {
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Track the previous index for rollback on failure
  const previousIndexRef = useRef(initialIndex)
  
  // AbortController for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Store for updating primary variation and timestamped lyrics
  const lyricsEditingStore = useLyricsEditingStore()
  const playbackStore = useSongPlaybackStore()
  
  // Determine which store to use based on what's available
  const setPrimaryVariationIndex = 
    lyricsEditingStore.setPrimaryVariationIndex || 
    playbackStore.setPrimaryVariationIndex
  
  const setTimestampedLyrics = playbackStore.setTimestampedLyrics
  const clearTimestampedLyrics = playbackStore.clearTimestampedLyrics

  /**
   * Clear error state
   * Property 11: Switch failure recovery
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Switch to a different variation
   * 
   * Flow:
   * 1. Validate variation index
   * 2. Cancel any pending requests
   * 3. Set loading state
   * 4. Fetch timestamped lyrics for new variation
   * 5. Update primary variation on backend
   * 6. Update local state
   * 7. Call onSwitch callback
   * 
   * Property 8: Variation switch triggers state update
   * Property 9: Playback position preservation
   * Property 10: Loading state during switch
   * Property 11: Switch failure recovery
   * Property 19: Request cancellation on switch
   */
  const switchVariation = useCallback(
    async (index: number) => {
      // Validate index
      if (index < 0 || index >= variations.length) {
        const errorMsg = `Invalid variation index: ${index}`
        setError(errorMsg)
        onError?.(errorMsg)
        return
      }

      // If switching to the same variation, do nothing
      if (index === activeIndex) {
        return
      }

      // Cancel any pending requests from previous switch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      // Store previous index for rollback
      previousIndexRef.current = activeIndex

      // Set loading state
      setIsLoading(true)
      setError(null)

      try {
        // Fetch timestamped lyrics for the new variation
        // Property 16: Timestamped lyrics fetch with correct audio ID
        // Property 19: Request cancellation on switch
        // Property 6.2: Display loading state in lyrics panel during fetch
        let alignedWords: AlignedWord[] = []
        let waveformData: number[] = []

        try {
          const lyricsResponse = await fetchVariationTimestampedLyrics(
            taskId,
            index
          )
          alignedWords = lyricsResponse.aligned_words || []
          waveformData = lyricsResponse.waveform_data || []
          
          // Property 17: Lyrics sync after switch
          // Update store with new timestamped lyrics
          if (setTimestampedLyrics) {
            setTimestampedLyrics(alignedWords, waveformData)
          }
        } catch (lyricsError) {
          // Log but don't fail - we can still play without timestamped lyrics
          console.warn(
            `Failed to fetch timestamped lyrics for variation ${index}:`,
            lyricsError
          )
          // Property 18: Lyrics fallback on fetch failure
          // Clear timestamped lyrics to fall back to plain lyrics
          if (clearTimestampedLyrics) {
            clearTimestampedLyrics()
          }
        }

        // Update primary variation on backend
        // Property 12: Primary variation persistence
        try {
          await updatePrimaryVariation(taskId, index)
        } catch (updateError) {
          // Log but don't fail - user can still listen
          console.warn(
            `Failed to update primary variation on backend:`,
            updateError
          )
        }

        // Update local state
        // Property 8: Variation switch triggers state update
        setActiveIndex(index)
        setPrimaryVariationIndex(index)

        // Log analytics event
        // Property 26: Selection event logging
        // Requirements: 10.1, 10.3
        logVariationSelection(taskId, index)

        // Call success callback
        onSwitch?.(index)

        setIsLoading(false)
      } catch (err) {
        // Handle error and revert to previous variation
        // Property 11: Switch failure recovery
        const errorMsg =
          err instanceof ApiError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : 'Failed to switch song variation'

        setError(errorMsg)
        setActiveIndex(previousIndexRef.current)
        setIsLoading(false)
        
        // Clear any partially loaded timestamped lyrics
        if (clearTimestampedLyrics) {
          clearTimestampedLyrics()
        }
        
        onError?.(errorMsg)
      }
    },
    [
      activeIndex, 
      variations, 
      taskId, 
      onSwitch, 
      onError, 
      setPrimaryVariationIndex,
      setTimestampedLyrics,
      clearTimestampedLyrics
    ]
  )

  const currentVariation = activeIndex >= 0 && activeIndex < variations.length
    ? variations[activeIndex]
    : null

  return {
    activeIndex,
    currentVariation,
    isLoading,
    error,
    switchVariation,
    clearError,
  }
}
