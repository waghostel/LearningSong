/**
 * Utility functions for LyricsDisplay component
 * Extracted to avoid react-refresh warnings
 */

import type { WordState } from '@/types/lyrics'

/**
 * Parse lyrics into sections by double line breaks or verse markers
 * @param lyrics - Raw lyrics string
 * @returns Array of section strings
 */
export function parseLyricsIntoSections(lyrics: string): string[] {
  // Check if lyrics contains any non-whitespace characters
  if (!lyrics || !/\S/.test(lyrics)) {
    return []
  }

  const trimmedLyrics = lyrics.trim()

  // Split by double newlines (paragraph breaks) or verse markers like [Verse], [Chorus], etc.
  const sections = trimmedLyrics
    .split(/\n\n+|\[(?:Verse|Chorus|Bridge|Intro|Outro|Hook|Pre-Chorus|Post-Chorus)[^\]]*\]/gi)
    .map((section) => section.trim())
    .filter((section) => section.length > 0)

  return sections.length > 0 ? sections : [trimmedLyrics]
}

/**
 * Calculate the current section index based on playback time and duration
 * Assumes sections are evenly distributed across the song duration
 * @param currentTime - Current playback time in seconds
 * @param duration - Total duration in seconds
 * @param totalSections - Total number of sections
 * @returns Current section index (0-based)
 */
export function calculateCurrentSection(
  currentTime: number,
  duration: number,
  totalSections: number
): number {
  if (totalSections <= 0 || duration <= 0 || currentTime < 0) {
    return 0
  }

  // Clamp currentTime to valid range
  const clampedTime = Math.min(Math.max(currentTime, 0), duration)
  
  // Calculate section based on time proportion
  const progress = clampedTime / duration
  const sectionIndex = Math.floor(progress * totalSections)
  
  // Ensure we don't exceed the last section
  return Math.min(sectionIndex, totalSections - 1)
}

/**
 * Get CSS classes for a word based on its state
 * @param state - The word's current state
 * @returns CSS class string
 */
export function getWordStateClasses(state: WordState): string {
  switch (state) {
    case 'current':
      return 'bg-primary text-primary-foreground font-semibold px-1 rounded'
    case 'completed':
      return 'text-muted-foreground'
    case 'upcoming':
    default:
      return 'text-foreground'
  }
}
