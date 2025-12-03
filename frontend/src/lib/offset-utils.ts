/**
 * Offset utility functions for timestamp lyrics adjustment
 * 
 * These utilities allow users to adjust the timing of lyrics highlighting
 * to compensate for synchronization discrepancies between Suno API timestamps
 * and actual audio playback.
 */

import type { AlignedWord } from '@/types/lyrics'

/**
 * Default offset range constraints (in milliseconds)
 */
export const OFFSET_MIN = -2000
export const OFFSET_MAX = 2000
export const OFFSET_STEP = 50

/**
 * Apply an offset to aligned words timestamps
 * 
 * @param alignedWords - Array of aligned words with timing data
 * @param offsetMs - Offset in milliseconds (positive = lyrics appear later, negative = earlier)
 * @returns New array of aligned words with adjusted timestamps
 * 
 * **Feature: song-playback-improvements, Property 4: Offset application to timestamps**
 * **Validates: Requirements 2.1**
 */
export function applyOffset(
  alignedWords: AlignedWord[],
  offsetMs: number
): AlignedWord[] {
  if (alignedWords.length === 0) {
    return []
  }

  const offsetSeconds = offsetMs / 1000

  return alignedWords.map((word) => ({
    ...word,
    startS: word.startS + offsetSeconds,
    endS: word.endS + offsetSeconds,
  }))
}

/**
 * Clamp an offset value to the valid range
 * 
 * @param value - The offset value to clamp
 * @param min - Minimum allowed value (default: -2000)
 * @param max - Maximum allowed value (default: 2000)
 * @returns Clamped offset value within the valid range
 * 
 * **Feature: song-playback-improvements, Property 5: Offset range constraint**
 * **Validates: Requirements 2.6**
 */
export function clampOffset(
  value: number,
  min: number = OFFSET_MIN,
  max: number = OFFSET_MAX
): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Format an offset value for display
 * 
 * @param offsetMs - Offset in milliseconds
 * @returns Formatted string with sign and "ms" suffix (e.g., "+150ms", "-50ms", "0ms")
 */
export function formatOffsetDisplay(offsetMs: number): string {
  if (offsetMs === 0) {
    return '0ms'
  }
  const sign = offsetMs > 0 ? '+' : ''
  return `${sign}${offsetMs}ms`
}

/**
 * Increment offset by the step value, respecting max constraint
 * 
 * @param currentOffset - Current offset value in milliseconds
 * @param step - Step size (default: 50ms)
 * @param max - Maximum allowed value (default: 2000)
 * @returns New offset value after increment
 * 
 * **Feature: song-playback-improvements, Property 6: Offset increment/decrement**
 * **Validates: Requirements 3.4**
 */
export function incrementOffset(
  currentOffset: number,
  step: number = OFFSET_STEP,
  max: number = OFFSET_MAX
): number {
  return Math.min(currentOffset + step, max)
}

/**
 * Decrement offset by the step value, respecting min constraint
 * 
 * @param currentOffset - Current offset value in milliseconds
 * @param step - Step size (default: 50ms)
 * @param min - Minimum allowed value (default: -2000)
 * @returns New offset value after decrement
 * 
 * **Feature: song-playback-improvements, Property 6: Offset increment/decrement**
 * **Validates: Requirements 3.3**
 */
export function decrementOffset(
  currentOffset: number,
  step: number = OFFSET_STEP,
  min: number = OFFSET_MIN
): number {
  return Math.max(currentOffset - step, min)
}
