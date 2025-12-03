/**
 * Hook for synchronizing lyrics with audio playback
 * Uses binary search for O(log n) word lookup performance
 * 
 * **Feature: timestamped-lyrics-sync**
 * **Validates: Requirements 1.2, 4.2**
 * 
 * **Feature: song-playback-improvements**
 * **Validates: Requirements 13.4, 13.5**
 */

import { useMemo } from 'react'
import type { AlignedWord, WordState } from '@/types/lyrics'
import { findWordAtTime, calculateWordProgress, classifyWordState } from '@/lib/lyrics-sync'
import { isSectionMarker, findNextNonMarkerIndex } from '@/lib/section-marker-utils'

export interface UseLyricsSyncOptions {
  alignedWords: AlignedWord[]
  currentTime: number
  skipMarkers?: boolean  // Skip section markers when highlighting
}

export interface UseLyricsSyncResult {
  /** Index of the current word in the alignedWords array (-1 if none) */
  currentWordIndex: number
  /** The current word object, or null if none */
  currentWord: AlignedWord | null
  /** Progress through the current word (0-1) */
  progress: number
  /** State of the current word */
  currentWordState: WordState
  /** Get the state of any word by index */
  getWordState: (index: number) => WordState
}

/**
 * Hook for synchronizing lyrics display with audio playback time
 * 
 * @param options - Configuration options
 * @param options.alignedWords - Array of aligned words sorted by startS
 * @param options.currentTime - Current playback time in seconds
 * @param options.skipMarkers - If true, skip section markers when highlighting (default: false)
 * @returns Sync result with current word info and utilities
 * 
 * @example
 * ```tsx
 * const { currentWordIndex, currentWord, progress } = useLyricsSync({
 *   alignedWords: song.alignedWords,
 *   currentTime: audioRef.current?.currentTime ?? 0,
 *   skipMarkers: true
 * })
 * ```
 */
export function useLyricsSync({
  alignedWords,
  currentTime,
  skipMarkers = false,
}: UseLyricsSyncOptions): UseLyricsSyncResult {
  // Memoize the word lookup result to avoid recalculating on every render
  // Only recalculate when alignedWords, currentTime, or skipMarkers changes
  const lookupResult = useMemo(() => {
    const result = findWordAtTime(alignedWords, currentTime)
    
    // If skipMarkers is enabled and the current word is a marker,
    // find the next non-marker word
    if (skipMarkers && result.index !== -1 && result.word) {
      if (isSectionMarker(result.word.word)) {
        const nextNonMarkerIndex = findNextNonMarkerIndex(alignedWords, result.index)
        
        if (nextNonMarkerIndex !== -1) {
          const nextWord = alignedWords[nextNonMarkerIndex]
          return {
            index: nextNonMarkerIndex,
            word: nextWord,
            state: classifyWordState(nextWord, currentTime) as WordState,
          }
        }
        
        // No non-marker word found, return -1
        return { index: -1, word: null, state: 'upcoming' as WordState }
      }
    }
    
    return result
  }, [alignedWords, currentTime, skipMarkers])

  // Memoize progress calculation
  const progress = useMemo(() => {
    return calculateWordProgress(lookupResult.word, currentTime)
  }, [lookupResult.word, currentTime])

  // Memoize the getWordState function to maintain referential equality
  const getWordState = useMemo(() => {
    return (index: number): WordState => {
      if (index < 0 || index >= alignedWords.length) {
        return 'upcoming'
      }
      return classifyWordState(alignedWords[index], currentTime)
    }
  }, [alignedWords, currentTime])

  return {
    currentWordIndex: lookupResult.index,
    currentWord: lookupResult.word,
    progress,
    currentWordState: lookupResult.state,
    getWordState,
  }
}
