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
export interface LineCue {
  lineIndex: number           // 0-based index
  text: string                // Full line text
  startTime: number           // Start time in seconds
  endTime: number             // End time in seconds
  isMarker: boolean           // True for section markers
}

/**
 * Normalizes text by trimming and removing extra whitespace
 * Used for matching edited lyrics lines to aligned words
 */
function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

/**
 * Extracts words from a line of text, handling word splits
 * 
 * @param lineText - A single line of lyrics text
 * @returns Array of normalized words
 * 
 * @example
 * ```ts
 * extractWordsFromLine("In the world of science")
 * // ["In", "the", "world", "of", "science"]
 * ```
 */
function extractWordsFromLine(lineText: string): string[] {
  return normalizeText(lineText)
    .split(/\s+/)
    .filter(word => word.length > 0)
}

/**
 * Finds matching aligned words for a line of edited lyrics
 * Handles word splits (e.g., "we're" → "we'" + "re")
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
  const lineWords = extractWordsFromLine(lineText)
  const matchedWords: AlignedWord[] = []
  const alignedIndex = startIndex

  // Try to match each aligned word to line words
  for (let i = alignedIndex; i < alignedWords.length; i++) {
    const alignedWord = alignedWords[i]
    const alignedWordNorm = normalizeText(alignedWord.word)
    const alignedLower = alignedWordNorm.toLowerCase()

    // Try to find this aligned word in the remaining line words
    let found = false
    for (let j = 0; j < lineWords.length; j++) {
      const lineWord = lineWords[j]
      const lineLower = lineWord.toLowerCase()

      // Exact match
      if (lineLower === alignedLower) {
        matchedWords.push(alignedWord)
        lineWords.splice(j, 1)
        found = true
        break
      }
      // Aligned word is part of line word (word split case)
      else if (lineLower.includes(alignedLower)) {
        matchedWords.push(alignedWord)
        // Remove the matched part from the line word
        const idx = lineLower.indexOf(alignedLower)
        lineWords[j] = lineWord.slice(0, idx) + lineWord.slice(idx + alignedWordNorm.length)
        if (lineWords[j].length === 0) {
          lineWords.splice(j, 1)
        }
        found = true
        break
      }
    }

    if (!found) {
      // If we can't find a match, stop here
      break
    }
  }

  return { words: matchedWords, nextIndex: startIndex + matchedWords.length }
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

      lineCues.push({
        lineIndex: lineCues.length,
        text: normalizeText(lineText),
        startTime,
        endTime,
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
  // Extract milliseconds before flooring
  const milliseconds = Math.round((seconds % 1) * 1000) % 1000
  const totalSeconds = Math.floor(seconds)

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  const pad = (num: number, length: number = 2): string => {
    return String(num).padStart(length, '0')
  }

  const timeStr = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(milliseconds, 3)}`
    : `${pad(minutes)}:${pad(secs)}.${pad(milliseconds, 3)}`

  return timeStr
}

/**
 * Generates VTT file content from line cues
 * 
 * Excludes section markers from the VTT output.
 * Applies offset to all timestamps if provided.
 * 
 * @param lineCues - Array of line cues with timing information
 * @param offset - Optional offset in milliseconds to apply to timestamps
 * @returns VTT file content as a string
 * 
 * **Validates: Requirements 7.5, 7.6**
 * 
 * @example
 * ```ts
 * const vttContent = generateVttContent(lineCues, 150)
 * // Returns VTT format string with offset applied
 * ```
 */
export function generateVttContent(lineCues: LineCue[], offset: number = 0): string {
  const offsetSeconds = offset / 1000
  const lines: string[] = ['WEBVTT', '']

  for (const cue of lineCues) {
    // Skip section markers in VTT output
    if (cue.isMarker) {
      continue
    }

    const startTime = formatVttTimestamp(cue.startTime + offsetSeconds)
    const endTime = formatVttTimestamp(cue.endTime + offsetSeconds)

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
  const blob = new Blob([content], { type: 'text/vtt;charset=utf-8' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
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
  const dateStr = createdAt.toISOString().split('T')[0]
  const styleStr = style.toLowerCase().replace(/\s+/g, '-')
  return `song-${styleStr}-${dateStr}.vtt`
}
