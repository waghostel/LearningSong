/**
 * Utilities for detecting and handling section markers in lyrics
 * Section markers are non-vocal elements like **[Verse 1]**, **[Chorus]**, etc.
 * 
 * **Feature: song-playback-improvements**
 * **Validates: Requirements 13.1, 13.2**
 */

import type { AlignedWord } from '@/types/lyrics'

/**
 * Detects if a word is a section marker (matches **...** pattern)
 * 
 * @param word - The word string to check
 * @returns true if the word matches the section marker pattern
 * 
 * @example
 * ```ts
 * isSectionMarker('**[Verse 1]**') // true
 * isSectionMarker('**Chorus**') // true
 * isSectionMarker('Hello') // false
 * isSectionMarker('**incomplete') // false
 * ```
 */
export function isSectionMarker(word: string): boolean {
  // Trim whitespace and check for **...** pattern
  const trimmed = word.trim()
  return trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4
}

/**
 * Classification result for aligned words
 */
export interface WordClassification {
  markers: AlignedWord[]
  lyrics: AlignedWord[]
}

/**
 * Classifies aligned words into section markers and actual lyrics
 * 
 * @param alignedWords - Array of aligned words to classify
 * @returns Object with separate arrays for markers and lyrics
 * 
 * @example
 * ```ts
 * const { markers, lyrics } = classifyAlignedWords(alignedWords)
 * console.log(`Found ${markers.length} markers and ${lyrics.length} lyric words`)
 * ```
 */
export function classifyAlignedWords(alignedWords: AlignedWord[]): WordClassification {
  const markers: AlignedWord[] = []
  const lyrics: AlignedWord[] = []

  for (const word of alignedWords) {
    if (isSectionMarker(word.word)) {
      markers.push(word)
    } else {
      lyrics.push(word)
    }
  }

  return { markers, lyrics }
}

/**
 * Finds the next non-marker word index starting from a given index
 * 
 * @param alignedWords - Array of aligned words
 * @param currentIndex - Starting index to search from
 * @returns Index of the next non-marker word, or -1 if none found
 * 
 * @example
 * ```ts
 * // If currentIndex points to a marker, find the next actual lyric
 * const nextLyricIndex = findNextNonMarkerIndex(alignedWords, currentIndex)
 * if (nextLyricIndex !== -1) {
 *   highlightWord(nextLyricIndex)
 * }
 * ```
 */
export function findNextNonMarkerIndex(
  alignedWords: AlignedWord[],
  currentIndex: number
): number {
  // Search forward from currentIndex
  for (let i = currentIndex; i < alignedWords.length; i++) {
    if (!isSectionMarker(alignedWords[i].word)) {
      return i
    }
  }
  
  // No non-marker word found
  return -1
}

/**
 * Checks if aligned words contain any section markers
 * 
 * @param alignedWords - Array of aligned words to check
 * @returns true if at least one section marker is found
 */
export function hasMarkers(alignedWords: AlignedWord[]): boolean {
  return alignedWords.some(word => isSectionMarker(word.word))
}
