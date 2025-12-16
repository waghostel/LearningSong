/**
 * VTT (WebVTT) subtitle file generation and line-level synchronization
 * 
 * This module handles:
 * - Aggregating word-level timestamps into line-level timestamps
 * - Generating VTT subtitle file content
 * - Formatting timestamps in VTT format
 * 
 * **Feature: song-playback-improvements**
 * **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6**
 */

import type { AlignedWord } from '@/types/lyrics'
import { isSectionMarker } from './section-marker-utils'

/**
 * Represents a line of lyrics with timing information
 */
/**
 * Represents a line of lyrics with timing information
 */
export interface LineCue {
  lineIndex: number           // 0-based index
  text: string                // Full line text
  startTime: number           // Start time in seconds
  endTime: number             // End time in seconds
  isMarker: boolean           // True for section markers
}

/**
 * Normalizes text by trimming and removing extra whitespace
 * Used for display text in LineCue
 */
export function normalizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return String(text || '').trim().replace(/\s+/g, ' ')
  }
  return text.trim().replace(/\s+/g, ' ')
}

/**
 * Normalizes text for matching purposes
 * Removes punctuation, lowercases, and handles Unicode characters
 * 
 * @param text - Text to normalize
 * @returns Normalized text string
 */
export function normalizeForMatching(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }
  const normalized = text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  return normalized.length > 0 ? normalized : text.toLowerCase().trim()
}

/**
 * Extracts words from a line of text
 * 
 * @param lineText - A single line of lyrics text
 * @returns Array of words
 */
function extractWordsFromLine(lineText: string): string[] {
  // Add spaces around common punctuation to ensure they are treated as separate tokens
  // but preserve them for matching if needed.
  // We explicitly avoid splitting apostrophes to keep contractions like "don't" together.
  const spaced = lineText.replace(/([!?.,;:"()[\]])/g, ' $1 ')
  return normalizeText(spaced)
    .split(/\s+/)
    .filter(word => word.length > 0)
}

/**
 * Finds matching aligned words for a line of edited lyrics
 * Robustly handles word splits (e.g., "we're" → "we" + "re") and punctuation
 * 
 * @param lineText - A single line from edited lyrics
 * @param alignedWords - All aligned words from Suno API
 * @param startIndex - Index to start searching from in alignedWords
 * @returns Object with matched words and the next search index
 */
function findMatchingWords(
  lineText: string,
  alignedWords: AlignedWord[],
  startIndex: number
): { words: AlignedWord[]; nextIndex: number } {
  // Prepare line tokens for matching
  const lineTokens = extractWordsFromLine(lineText)
    .map(normalizeForMatching)
    .filter(t => t.length > 0)
    
  const matchedWords: AlignedWord[] = []
  let nextIndex = startIndex
  let currentTokenIdx = 0

  // Iterate through aligned words starting from key index
  for (let i = startIndex; i < alignedWords.length; i++) {
    const alignedWord = alignedWords[i]
    const alignedNorm = normalizeForMatching(alignedWord.word)

    // Skip aligned words that normalize to empty string (just punctuation/whitespace)
    // But include them in the match to preserve timing continuity
    if (alignedNorm.length === 0) {
      matchedWords.push(alignedWord)
      nextIndex = i + 1
      continue
    }

    // Stop if we've matched all line tokens
    if (currentTokenIdx >= lineTokens.length) {
      break
    }

    const lineToken = lineTokens[currentTokenIdx]

    // Case 1: Exact match
    if (lineToken === alignedNorm) {
      matchedWords.push(alignedWord)
      currentTokenIdx++
      nextIndex = i + 1
    }
    // Case 2: Aligned word is a prefix of line token (Split word case)
    // E.g. line="we're" (norm="were"), aligned="we", then "re"
    else if (lineToken.startsWith(alignedNorm)) {
      matchedWords.push(alignedWord)
      // Update the current token to be the remainder
      lineTokens[currentTokenIdx] = lineToken.slice(alignedNorm.length)
      nextIndex = i + 1
    }
    // Case 3: Line token is a prefix of aligned word (Merge word case)
    // E.g. line="Word", "Word" (from "Word Word"), aligned="WordWord" (e.g. from NBSP)
    else if (alignedNorm.startsWith(lineToken)) {
      let combined = lineToken
      let offset = 1
      let merged = false

      // Look ahead to combine tokens
      while (currentTokenIdx + offset < lineTokens.length) {
        combined += lineTokens[currentTokenIdx + offset]
        
        if (combined === alignedNorm) {
          matchedWords.push(alignedWord)
          currentTokenIdx += offset + 1
          nextIndex = i + 1
          merged = true
          break
        }
        
        // If combined string is no longer a prefix, stop trying
        if (!alignedNorm.startsWith(combined)) {
          break
        }
        offset++
      }

      if (merged) {
        continue
      }

      // If merge failed, check skip logic below
    }
    // Case 3: Mismatch
    else {
      // Check if we can skip this aligned word.
      // If it is purely punctuation (stripped to empty by strict normalization)
      // and didn't match the line token, we include it as part of the match sequence
      // (assuming it's noise/punctuation associated with the flow) and continue.
      const strictNorm = alignedWord.word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
      if (strictNorm.length === 0) {
        matchedWords.push(alignedWord)
        nextIndex = i + 1
        continue
      }

      // If we encounter a real mismatch (content word), we stop matching for this line.
      break
    }
  }

  return { words: matchedWords, nextIndex: matchedWords.length > 0 ? nextIndex : startIndex }
}



/**
 * Aggregates word-level timestamps into line-level timestamps
 * 
 * Matches each line from edited lyrics to corresponding words in aligned words,
 * using the first word's startS as line start time and last word's endS as line end time.
 * Detects section markers and marks them in the LineCue.
 * 
 * @param alignedWords - Word-level timing data from Suno API
 * @param editedLyrics - Full lyrics text from the Lyrics Editing page (lines separated by \n)
 * @returns Array of LineCue objects with line-level timestamps
 * 
 * **Feature: song-playback-improvements, Property 13: Line aggregation timestamp bounds**
 * **Feature: song-playback-improvements, Property 24: Line aggregation completeness**
 * **Validates: Requirements 7.2, 7.3, 7.4**
 * 
 * @example
 * ```ts
 * const lineCues = aggregateWordsToLines(alignedWords, editedLyrics)
 * // Returns array of LineCue with startTime, endTime, text, and isMarker flag
 * ```
 */
export function aggregateWordsToLines(
  alignedWords: AlignedWord[],
  editedLyrics: string
): LineCue[] {
  // Handle null/undefined inputs gracefully (Property 17)
  if (!alignedWords || !Array.isArray(alignedWords) || alignedWords.length === 0) {
    return []
  }
  
  if (!editedLyrics || typeof editedLyrics !== 'string') {
    return []
  }

  const lineCues: LineCue[] = []
  const lyricsLines = editedLyrics.split('\n')
  let alignedIndex = 0

  for (let lineIndex = 0; lineIndex < lyricsLines.length; lineIndex++) {
    const lineText = lyricsLines[lineIndex]

    // Skip empty lines
    if (normalizeText(lineText).length === 0) {
      continue
    }

    // Check if this line is a section marker
    const isMarker = isSectionMarker(lineText)

    // Find matching aligned words for this line
    const { words: matchedWords, nextIndex } = findMatchingWords(
      lineText,
      alignedWords,
      alignedIndex
    )

    // Only create LineCue if we found matching words
    if (matchedWords.length > 0) {
      const startTime = matchedWords[0].startS
      const endTime = matchedWords[matchedWords.length - 1].endS

      // Ensure timestamps are valid (Property 15: Non-negative timestamp enforcement)
      const validStartTime = Math.max(0, startTime)
      const validEndTime = Math.max(validStartTime, endTime)

      lineCues.push({
        lineIndex: lineCues.length,
        text: normalizeText(lineText),
        startTime: validStartTime,
        endTime: validEndTime,
        isMarker,
      })

      alignedIndex = nextIndex
    }
  }

  return lineCues
}

/**
 * Formats a timestamp in VTT format (HH:MM:SS.mmm)
 * Hours are optional if less than 1 hour
 * 
 * @param seconds - Time in seconds
 * @returns Formatted timestamp string
 * 
 * **Feature: song-playback-improvements, Property 14: VTT timestamp format**
 * **Validates: Requirements 7.5**
 * 
 * @example
 * ```ts
 * formatVttTimestamp(65.5)    // "01:05.500"
 * formatVttTimestamp(3665.5)  // "01:01:05.500"
 * formatVttTimestamp(0.5)     // "00:00.500"
 * ```
 */
export function formatVttTimestamp(seconds: number): string {
  // Handle invalid inputs gracefully
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00.000'
  }

  // Convert to milliseconds first to avoid floating point precision issues
  const totalMilliseconds = Math.round(seconds * 1000)
  
  // Extract components from total milliseconds
  const milliseconds = totalMilliseconds % 1000
  const totalSeconds = Math.floor(totalMilliseconds / 1000)
  
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  const pad = (num: number, length: number = 2): string => {
    return String(num).padStart(length, '0')
  }

  // WebVTT format: MM:SS.mmm or HH:MM:SS.mmm
  const timeStr = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(milliseconds, 3)}`
    : `${pad(minutes)}:${pad(secs)}.${pad(milliseconds, 3)}`

  return timeStr
}

/**
 * Validates that a timestamp string conforms to WebVTT format
 * 
 * @param timestamp - Timestamp string to validate
 * @returns True if the timestamp is valid WebVTT format
 * 
 * **Feature: vtt-download-enhancement**
 * **Validates: Requirements 5.1, 5.4**
 * 
 * @example
 * ```ts
 * validateVttTimestamp('01:23.456') // true
 * validateVttTimestamp('01:23:45.678') // true
 * validateVttTimestamp('invalid') // false
 * ```
 */
export function validateVttTimestamp(timestamp: string): boolean {
  if (typeof timestamp !== 'string') {
    return false
  }

  // WebVTT timestamp pattern: MM:SS.mmm or HH:MM:SS.mmm
  const vttPattern = /^(\d{2}:)?\d{2}:\d{2}\.\d{3}$/
  
  if (!vttPattern.test(timestamp)) {
    return false
  }

  // Additional validation: check that time components are in valid ranges
  const parts = timestamp.split(':')
  const lastPart = parts[parts.length - 1] // SS.mmm
  const [seconds, milliseconds] = lastPart.split('.')
  
  const secondsNum = parseInt(seconds, 10)
  const millisecondsNum = parseInt(milliseconds, 10)
  
  // Seconds should be 0-59, milliseconds should be 0-999
  if (secondsNum < 0 || secondsNum > 59) {
    return false
  }
  
  if (millisecondsNum < 0 || millisecondsNum > 999) {
    return false
  }
  
  // Validate minutes based on format
  if (parts.length === 3) {
    // HH:MM:SS.mmm format - validate both hours and minutes
    const minutesNum = parseInt(parts[1], 10)
    if (minutesNum < 0 || minutesNum > 59) {
      return false
    }
  } else if (parts.length === 2) {
    // MM:SS.mmm format - validate minutes (first part)
    const minutesNum = parseInt(parts[0], 10)
    if (minutesNum < 0 || minutesNum > 59) {
      return false
    }
  }
  
  return true
}

/**
 * Clamps a value to be non-negative (>= 0)
 * Used to ensure timestamps never go negative when offsets are applied
 * 
 * @param value - The value to clamp
 * @returns The value clamped to be >= 0
 * 
 * **Feature: vtt-download-enhancement, Property 15: Non-negative timestamp enforcement**
 * **Validates: Requirements 5.5**
 */
export function clampToNonNegative(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, value)
}

/**
 * Generates VTT file content from line cues
 * 
 * Excludes section markers from the VTT output.
 * Applies offset to all timestamps if provided.
 * Ensures all timestamps are non-negative (clamped to 0 if offset would make them negative).
 * 
 * @param lineCues - Array of line cues with timing information
 * @param offset - Optional offset in milliseconds to apply to timestamps
 * @returns VTT file content as a string
 * 
 * **Feature: vtt-download-enhancement, Property 15: Non-negative timestamp enforcement**
 * **Validates: Requirements 5.5, 7.5, 7.6**
 * 
 * @example
 * ```ts
 * const vttContent = generateVttContent(lineCues, 150)
 * // Returns VTT format string with offset applied
 * ```
 */
export function generateVttContent(lineCues: LineCue[], offset: number = 0): string {
  // Handle malformed input gracefully (Property 17)
  if (!lineCues || !Array.isArray(lineCues)) {
    return 'WEBVTT\n\n'
  }

  const offsetSeconds = offset / 1000
  const lines: string[] = ['WEBVTT', '']

  for (const cue of lineCues) {
    // Skip null/undefined cues (Property 17)
    if (!cue || typeof cue !== 'object') {
      continue
    }

    // Skip section markers in VTT output
    if (cue.isMarker) {
      continue
    }

    // Skip cues with invalid or missing data
    if (typeof cue.startTime !== 'number' || typeof cue.endTime !== 'number' || typeof cue.text !== 'string') {
      continue
    }

    // Clamp timestamps to non-negative values (Property 15)
    const adjustedStart = clampToNonNegative(cue.startTime + offsetSeconds)
    const adjustedEnd = clampToNonNegative(cue.endTime + offsetSeconds)

    const startTime = formatVttTimestamp(adjustedStart)
    const endTime = formatVttTimestamp(adjustedEnd)

    lines.push(`${startTime} --> ${endTime}`)
    lines.push(cue.text)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Triggers download of VTT file content
 * 
 * @param content - VTT file content as string
 * @param filename - Filename for the downloaded file (e.g., "song-pop-2024-12-03.vtt")
 * 
 * **Validates: Requirements 10.2, 10.3**
 * 
 * @example
 * ```ts
 * const content = generateVttContent(lineCues)
 * downloadVttFile(content, 'my-song.vtt')
 * ```
 */
export function downloadVttFile(content: string, filename: string): void {
  try {
    // Handle invalid content gracefully (Property 17)
    const safeContent = String(content || 'WEBVTT\n\n')
    const safeFilename = String(filename || 'download.vtt')

    // Check for browser support
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
      console.warn('Browser does not support file download')
      return
    }

    if (!document || !document.createElement || !document.body) {
      console.warn('DOM not available for file download')
      return
    }

    const blob = new Blob([safeContent], { type: 'text/vtt;charset=utf-8' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', safeFilename)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to download VTT file:', error)
    // Graceful degradation - could show user a text area with content
  }
}

/**
 * Generates a filename for VTT download based on song style and date
 * 
 * @param style - Music style (e.g., "Pop", "Rap", "Folk")
 * @param createdAt - Date the song was created
 * @returns Filename string (e.g., "song-pop-2024-12-03.vtt")
 * 
 * @example
 * ```ts
 * generateVttFilename('Pop', new Date('2024-12-03'))
 * // "song-pop-2024-12-03.vtt"
 * ```
 */
export function generateVttFilename(style: string, createdAt: Date): string {
  // Handle invalid date gracefully (Property 17: Error handling)
  let dateStr = 'unknown-date'
  try {
    if (createdAt && !isNaN(createdAt.getTime())) {
      dateStr = createdAt.toISOString().split('T')[0]
    }
  } catch {
    // Fall back to unknown-date if toISOString fails
  }
  
  // Normalize style: lowercase, replace non-alphanumeric with hyphens, collapse hyphens, trim start/end hyphens
  const styleStr = style.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  
  // Fallback if style becomes empty
  const finalStyle = styleStr.length > 0 ? styleStr : 'unknown'
  
  return `song-${finalStyle}-${dateStr}.vtt`
}
