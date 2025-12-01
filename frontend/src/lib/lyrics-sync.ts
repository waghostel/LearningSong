/**
 * Lyrics synchronization utilities
 * Provides O(log n) lookup for finding the current word based on playback time
 * 
 * **Feature: timestamped-lyrics-sync, Property 4: Binary search correctness**
 * **Validates: Requirements 4.1, 4.2**
 */

import type { AlignedWord, WordState, WordLookupResult } from '@/types/lyrics'

/**
 * Classify a word's state based on current playback time
 * @param word - The aligned word to classify
 * @param currentTime - Current playback time in seconds
 * @returns WordState: 'current', 'completed', or 'upcoming'
 */
export function classifyWordState(word: AlignedWord, currentTime: number): WordState {
  if (currentTime >= word.startS && currentTime <= word.endS) {
    return 'current'
  }
  if (currentTime > word.endS) {
    return 'completed'
  }
  return 'upcoming'
}

/**
 * Find the word at a given time using binary search
 * Returns the word whose time range contains the current time,
 * or the nearest word if no exact match exists.
 * 
 * @param alignedWords - Array of aligned words sorted by startS
 * @param currentTime - Current playback time in seconds
 * @returns WordLookupResult with index, word, and state
 * 
 * Time complexity: O(log n)
 */
export function findWordAtTime(
  alignedWords: AlignedWord[],
  currentTime: number
): WordLookupResult {
  // Handle empty array
  if (alignedWords.length === 0) {
    return { index: -1, word: null, state: 'upcoming' }
  }

  // Handle time before first word
  const firstWord = alignedWords[0]
  if (currentTime < firstWord.startS) {
    return { index: 0, word: firstWord, state: 'upcoming' }
  }

  // Handle time after last word
  const lastWord = alignedWords[alignedWords.length - 1]
  if (currentTime > lastWord.endS) {
    return { 
      index: alignedWords.length - 1, 
      word: lastWord, 
      state: 'completed' 
    }
  }

  // Binary search for the word containing currentTime
  let left = 0
  let right = alignedWords.length - 1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const word = alignedWords[mid]

    if (currentTime >= word.startS && currentTime <= word.endS) {
      // Found exact match - time is within this word's range
      return { index: mid, word, state: 'current' }
    }

    if (currentTime < word.startS) {
      // Time is before this word, search left
      right = mid - 1
    } else {
      // Time is after this word (currentTime > word.endS), search right
      left = mid + 1
    }
  }

  // No exact match found - time falls in a gap between words
  // Return the nearest word (the one that just ended or is about to start)
  if (left >= alignedWords.length) {
    // Past the last word
    const lastW = alignedWords[alignedWords.length - 1]
    return { 
      index: alignedWords.length - 1, 
      word: lastW, 
      state: classifyWordState(lastW, currentTime) 
    }
  }

  if (right < 0) {
    // Before the first word
    const firstW = alignedWords[0]
    return { index: 0, word: firstW, state: classifyWordState(firstW, currentTime) }
  }

  // In a gap between words - return the nearest word
  const upcomingWord = alignedWords[left]
  const previousWord = alignedWords[right]
  
  // Determine which word is closer
  const distToUpcoming = upcomingWord.startS - currentTime
  const distToPrevious = currentTime - previousWord.endS

  if (distToPrevious <= distToUpcoming) {
    return { 
      index: right, 
      word: previousWord, 
      state: classifyWordState(previousWord, currentTime) 
    }
  }

  return { 
    index: left, 
    word: upcomingWord, 
    state: classifyWordState(upcomingWord, currentTime) 
  }
}

/**
 * Calculate progress through the current word (0-1)
 * @param word - The current aligned word
 * @param currentTime - Current playback time in seconds
 * @returns Progress value between 0 and 1
 */
export function calculateWordProgress(
  word: AlignedWord | null,
  currentTime: number
): number {
  if (!word) return 0
  
  const duration = word.endS - word.startS
  if (duration <= 0) return 1
  
  const elapsed = currentTime - word.startS
  return Math.max(0, Math.min(1, elapsed / duration))
}
