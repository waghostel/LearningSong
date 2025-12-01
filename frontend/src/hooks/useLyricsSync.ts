/**
 * Hook for synchronizing lyrics with audio playback
 * Uses binary search for O(log n) word lookup performance
 * 
 * **Feature: timestamped-lyrics-sync**
 * **Validates: Requirements 1.2, 4.2**
 */

import { useMemo } from 'react'
import type { AlignedWord, WordState } from '@/types/lyrics'
import { findWordAtTime, calculateWordProgress, classifyWordState } from '@/lib/lyrics-sync'

export interface UseLyricsSyncOptions {
  alignedWords: AlignedWord[]
  currentTime: number
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
 * @returns Sync result with current word info and utilities
 * 
 * @example
 * ```tsx
 * const { currentWordIndex, currentWord, progress } = useLyricsSync({
 *   alignedWords: song.alignedWords,
 *   currentTime: audioRef.current?.currentTime ?? 0
 * })
 * ```
 */
export function useLyricsSync({
  alignedWords,
  currentTime,
}: UseLyricsSyncOptions): UseLyricsSyncResult {
  // Memoize the word lookup result to avoid recalculating on every render
  // Only recalculate when alignedWords or currentTime changes
  const lookupResult = useMemo(() => {
    return findWordAtTime(alignedWords, currentTime)
  }, [alignedWords, currentTime])

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
