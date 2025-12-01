/**
 * Types for timestamped lyrics synchronization
 * Matches backend AlignedWord and TimestampedLyrics dataclasses
 */

/**
 * Represents a word with timing information from Suno API
 */
export interface AlignedWord {
  word: string
  startS: number  // Start time in seconds
  endS: number    // End time in seconds
  success: boolean
  palign: number
}

/**
 * Response structure for timestamped lyrics
 */
export interface TimestampedLyrics {
  alignedWords: AlignedWord[]
  waveformData: number[]
  hasTimestamps: boolean
}

/**
 * Word state during playback
 */
export type WordState = 'current' | 'completed' | 'upcoming'

/**
 * Result of binary search for word at time
 */
export interface WordLookupResult {
  index: number
  word: AlignedWord | null
  state: WordState
}
