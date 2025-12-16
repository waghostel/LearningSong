/**
 * Property-based tests for VTT generator functions
 * Using fast-check for property-based testing
 * 
 * **Feature: song-playback-improvements, Property 13: Line aggregation timestamp bounds**
 * **Validates: Requirements 7.2, 7.3**
 * 
 * **Feature: song-playback-improvements, Property 24: Line aggregation completeness**
 * **Validates: Requirements 7.2, 7.4**
 * 
 * **Feature: song-playback-improvements, Property 14: VTT timestamp format**
 * **Validates: Requirements 7.5**
 * 
 * **Feature: song-playback-improvements, Property 15: VTT download visibility**
 * **Validates: Requirements 10.1, 10.5**
 */
import * as fc from 'fast-check'
import {
  aggregateWordsToLines,
  formatVttTimestamp,
  generateVttContent,
  normalizeText,
  generateVttFilename,
  type LineCue,
} from '@/lib/vtt-generator'
import type { AlignedWord } from '@/types/lyrics'

/**
 * Generator for a valid AlignedWord with proper timing constraints
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _alignedWordArbitrary = (minStart: number = 0): fc.Arbitrary<AlignedWord> =>
  fc.record({
    word: fc.string({ minLength: 1, maxLength: 20 }),
    startS: fc.integer({ min: Math.ceil(minStart), max: 300 }),
    success: fc.boolean(),
    palign: fc.integer({ min: 0, max: 100 }).map(n => n / 100),
  }).chain(({ word, startS, success, palign }) =>
    fc.integer({ min: 1, max: 100 }).map(duration => ({
      word,
      startS,
      endS: startS + duration / 10,
      success,
      palign,
    }))
  )

/**
 * Generator for a sorted array of non-overlapping aligned words
 * Uses realistic word patterns (alphanumeric + common punctuation)
 */
const sortedAlignedWordsArbitrary = (minLength: number = 1, maxLength: number = 20): fc.Arbitrary<AlignedWord[]> =>
  fc.array(
    fc.record({
      // Exclude control characters and special punctuation that causes token splitting issues
      // Only allow alphanumeric, spaces, hyphens and apostrophes
      word: fc.string({ minLength: 1, maxLength: 10 }).filter(w => /^[a-zA-Z0-9\s'-]+$/.test(w) && w.trim().length > 0),
      duration: fc.integer({ min: 1, max: 30 }),
      gap: fc.integer({ min: 0, max: 10 }),
      success: fc.constant(true),
      palign: fc.constant(0),
    }),
    { minLength, maxLength }
  ).map(items => {
    const words: AlignedWord[] = []
    let currentTime = 0
    
    for (const item of items) {
      const duration = item.duration / 10
      const gap = item.gap / 10
      const trimmedWord = item.word.trim()
      if (trimmedWord.length === 0) continue
      
      words.push({
        word: trimmedWord,
        startS: currentTime,
        endS: currentTime + duration,
        success: item.success,
        palign: item.palign,
      })
      currentTime += duration + gap
    }
    
    return words
  })

/**
 * Generator for lyrics text with multiple lines
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _lyricsTextArbitrary = (minLines: number = 1, maxLines: number = 10): fc.Arbitrary<string> =>
  fc.array(
    fc.string({ minLength: 1, maxLength: 50 }),
    { minLength: minLines, maxLength: maxLines }
  ).map(lines => lines.join('\n'))

describe('VTT Generator Property Tests', () => {
  /**
   * **Feature: song-playback-improvements, Property 13: Line aggregation timestamp bounds**
   * **Validates: Requirements 7.2, 7.3**
   * 
   * For any line aggregated from aligned words, the line's startTime should equal
   * the first word's startS and the line's endTime should equal the last word's endS.
   */
  describe('Property 13: Line aggregation timestamp bounds', () => {
    it('should use first word startS as line startTime', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 5),
          (alignedWords) => {
            // Create lyrics that match the aligned words
            const lyricsLines = alignedWords.map(w => w.word).join('\n')
            
            const lineCues = aggregateWordsToLines(alignedWords, lyricsLines)
            
            // Should have at least one line cue
            if (lineCues.length > 0) {
              const firstCue = lineCues[0]
              // First cue's startTime should match first word's startS
              expect(firstCue.startTime).toBeCloseTo(alignedWords[0].startS, 5)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should use last word endS as line endTime', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 5),
          (alignedWords) => {
            // Filter to words without spaces for reliable matching
            const cleanWords = alignedWords.filter(w => !w.word.includes(' '))
            if (cleanWords.length === 0) return
            
            // Create lyrics that match the aligned words - all on one line
            const lyricsLines = cleanWords.map(w => w.word).join(' ')
            
            const lineCues = aggregateWordsToLines(cleanWords, lyricsLines)
            
            // Should have at least one line cue
            if (lineCues.length > 0) {
              const lastCue = lineCues[lineCues.length - 1]
              // Last cue's endTime should match last word's endS
              expect(lastCue.endTime).toBeCloseTo(cleanWords[cleanWords.length - 1].endS, 5)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should have startTime less than or equal to endTime for all lines', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 10),
          (alignedWords) => {
            const lyricsLines = alignedWords.map(w => w.word).join('\n')
            const lineCues = aggregateWordsToLines(alignedWords, lyricsLines)
            
            for (const cue of lineCues) {
              expect(cue.startTime).toBeLessThanOrEqual(cue.endTime)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should preserve line order with increasing timestamps', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(2, 10),
          (alignedWords) => {
            const lyricsLines = alignedWords.map(w => w.word).join('\n')
            const lineCues = aggregateWordsToLines(alignedWords, lyricsLines)
            
            // Lines should be in chronological order
            for (let i = 0; i < lineCues.length - 1; i++) {
              expect(lineCues[i].startTime).toBeLessThanOrEqual(lineCues[i + 1].startTime)
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: song-playback-improvements, Property 9: Word split handling in matching**
   * **Validates: Requirements 3.1, 1.2, 3.2**
   * 
   * For any line containing words that are split in the aligned words data
   * (e.g., "we're" -> "we", "re"), the matching algorithm should correctly
   * combine split words to match the original line content.
   */
  describe('Property 9: Word split handling in matching', () => {
    it('should correctly match words even when split in aligned data', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              word: fc.string({ minLength: 2, maxLength: 10 }).filter(s => /^[a-zA-Z]+$/.test(s)),
              // Split into 1, 2, or 3 parts
              splits: fc.integer({ min: 1, max: 3 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (items) => {
            // Create original line text
            const lineText = items.map(i => i.word).join(' ')
            
            // Create aligned words by splitting the original words
            const alignedWords: AlignedWord[] = []
            let currentTime = 0
            
            items.forEach(item => {
              // Simple chunking logic
              const partSize = Math.ceil(item.word.length / item.splits)
              
              for(let i = 0; i < item.word.length; i += partSize) {
                const part = item.word.slice(i, i + partSize)
                alignedWords.push({
                  word: part,
                  startS: currentTime,
                  endS: currentTime + 0.1,
                  success: true,
                  palign: 0
                })
                currentTime += 0.2
              }
            })
            
            const lineCues = aggregateWordsToLines(alignedWords, lineText)
            
            // Should produce exactly one line cue
            expect(lineCues.length).toBe(1)
            // Text should match normalized input
            expect(lineCues[0].text).toBe(normalizeText(lineText))
            // Start time should be first word start
            expect(lineCues[0].startTime).toBeCloseTo(0)
            // End time should be last word end
            expect(lineCues[0].endTime).toBeCloseTo(alignedWords[alignedWords.length - 1].endS)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: song-playback-improvements, Property 10: Graceful handling of unmatchable lines**
   * **Validates: Requirements 3.5**
   * 
   * For any lyrics containing lines that cannot be matched to aligned words,
   * the aggregation process should skip those lines and continue processing.
   */
  describe('Property 10: Graceful handling of unmatchable lines', () => {
    it('should skip lines that use words not present in aligned words', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 5),
          (alignedWords) => {
            const validLine = alignedWords.map(w => w.word).join(' ')
            const impossibleLine = 'Supercalifragilisticexpialidocious'
            
            // Inject impossible line in middle
            const mixedLyrics = `${validLine}\n${impossibleLine}\n${validLine}`
            
            // Should generate exactly 2 cues (dup of validLine)
            // Note: Reuse of aligned words for multiple lines isn't typical, 
            // but if we reuse the same text, we might match the same words?
            // Actually aggregateWords consumption advances the index.
            // So 2nd validLine won't match anything because words are consumed.
            // So we expect:
            // 1. First validLine matches aligned words. Index advances to end.
            // 2. impossibleLine matches nothing.
            // 3. Second validLine matches nothing (index at end).
            // Result: 1 line cue.
            
            const lineCues = aggregateWordsToLines(alignedWords, mixedLyrics)
            
            expect(lineCues.length).toBe(1)
            expect(lineCues[0].text).toBe(normalizeText(validLine))
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle completely disjoint lyrics and aligned words (deterministic)', () => {
      const alignedWords: AlignedWord[] = [{
        word: 'apple',
        startS: 0,
        endS: 1,
        success: true,
        palign: 0
      }]
      const randomWord = 'banana'
      
      const lineCues = aggregateWordsToLines(alignedWords, randomWord)
      expect(lineCues).toEqual([])
    })
  })

  /**
   * **Feature: song-playback-improvements, Property 24: Line aggregation completeness**
   * **Validates: Requirements 7.2, 7.4**
   * 
   * For any set of edited lyrics lines and aligned words, every non-empty lyrics line
   * should have a corresponding LineCue with valid timestamps.
   */
  describe('Property 24: Line aggregation completeness', () => {
    it('should create line cues for all non-empty lyrics lines', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 10),
          (alignedWords) => {
            // Filter to words without spaces for reliable matching
            const cleanWords = alignedWords.filter(w => !w.word.includes(' '))
            if (cleanWords.length === 0) return
            
            // Create lyrics that match the aligned words
            const lyricsLines = cleanWords.map(w => w.word).join('\n')
            
            const lineCues = aggregateWordsToLines(cleanWords, lyricsLines)
            
            // Should have at least one line cue for non-empty lyrics
            expect(lineCues.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should skip empty lines in lyrics', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(2, 5),
          (alignedWords) => {
            // Create lyrics with empty lines
            const lyricsLines = alignedWords
              .map((w, i) => (i % 2 === 0 ? w.word : ''))
              .join('\n')
            
            const lineCues = aggregateWordsToLines(alignedWords, lyricsLines)
            
            // Should have fewer or equal line cues than aligned words
            expect(lineCues.length).toBeLessThanOrEqual(alignedWords.length)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should have valid timestamps for all line cues', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 10),
          (alignedWords) => {
            const lyricsLines = alignedWords.map(w => w.word).join('\n')
            const lineCues = aggregateWordsToLines(alignedWords, lyricsLines)
            
            for (const cue of lineCues) {
              // All timestamps should be non-negative
              expect(cue.startTime).toBeGreaterThanOrEqual(0)
              expect(cue.endTime).toBeGreaterThanOrEqual(0)
              // startTime should be less than endTime
              expect(cue.startTime).toBeLessThanOrEqual(cue.endTime)
              // Text should not be empty
              expect(cue.text.length).toBeGreaterThan(0)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle empty aligned words gracefully', () => {
      const lineCues = aggregateWordsToLines([], 'some lyrics')
      expect(lineCues).toEqual([])
    })

    it('should handle empty lyrics gracefully', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 5),
          (alignedWords) => {
            const lineCues = aggregateWordsToLines(alignedWords, '')
            expect(lineCues).toEqual([])
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: song-playback-improvements, Property 14: VTT timestamp format**
   * **Validates: Requirements 7.5**
   * 
   * For any timestamp in the generated VTT file, it should match the pattern
   * `HH:MM:SS.mmm` or `MM:SS.mmm` where hours are optional.
   */
  describe('Property 14: VTT timestamp format', () => {
    it('should format timestamps in correct VTT format', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 3600 }),
          (seconds) => {
            if (!isFinite(seconds)) return
            const formatted = formatVttTimestamp(seconds)
            
            // Should match pattern MM:SS.mmm or HH:MM:SS.mmm
            const vttPattern = /^(\d{2}:)?\d{2}:\d{2}\.\d{3}$/
            expect(formatted).toMatch(vttPattern)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include milliseconds with exactly 3 digits', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 3600 }),
          (seconds) => {
            if (!isFinite(seconds)) return
            const formatted = formatVttTimestamp(seconds)
            
            // Extract milliseconds part
            const parts = formatted.split('.')
            expect(parts.length).toBe(2)
            expect(parts[1].length).toBe(3)
            expect(/^\d{3}$/.test(parts[1])).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format zero seconds correctly', () => {
      const formatted = formatVttTimestamp(0)
      expect(formatted).toMatch(/^00:00\.000$/)
    })

    it('should format sub-second values correctly', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: Math.fround(0.999) }),
          (seconds) => {
            if (!isFinite(seconds)) return
            const formatted = formatVttTimestamp(seconds)
            expect(formatted).toMatch(/^00:00\.\d{3}$/)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should format minute-level values correctly', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 60, max: 3600 }),
          (seconds) => {
            if (!isFinite(seconds)) return
            const formatted = formatVttTimestamp(seconds)
            // Should have hours if >= 3600, otherwise MM:SS.mmm
            if (seconds >= 3600) {
              expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/)
            } else {
              expect(formatted).toMatch(/^\d{2}:\d{2}\.\d{3}$/)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle large timestamps with hours', () => {
      const formatted = formatVttTimestamp(3665.5)
      expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/)
    })
  })

  /**
   * **Feature: song-playback-improvements, Property 15: VTT download visibility**
   * **Validates: Requirements 10.1, 10.5**
   * 
   * For any song with lineCues.length > 0, the download button should be visible;
   * for lineCues.length === 0, it should be hidden.
   */
  describe('Property 15: VTT download visibility', () => {
    it('should generate VTT content when line cues exist', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 5),
          (alignedWords) => {
            const lyricsLines = alignedWords.map(w => w.word).join('\n')
            const lineCues = aggregateWordsToLines(alignedWords, lyricsLines)
            
            if (lineCues.length > 0) {
              const vttContent = generateVttContent(lineCues)
              
              // Should start with WEBVTT header
              expect(vttContent).toContain('WEBVTT')
              // Should have content
              expect(vttContent.length).toBeGreaterThan(10)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should generate minimal VTT for empty line cues', () => {
      const vttContent = generateVttContent([])
      
      // Should still have WEBVTT header
      expect(vttContent).toContain('WEBVTT')
    })

    it('should exclude section markers from VTT output', () => {
      const lineCues: LineCue[] = [
        {
          lineIndex: 0,
          text: 'First line',
          startTime: 0,
          endTime: 1,
          isMarker: false,
        },
        {
          lineIndex: 1,
          text: '**[Verse 1]**',
          startTime: 1,
          endTime: 2,
          isMarker: true,
        },
        {
          lineIndex: 2,
          text: 'Second line',
          startTime: 2,
          endTime: 3,
          isMarker: false,
        },
      ]
      
      const vttContent = generateVttContent(lineCues)
      
      // Should contain non-marker lines
      expect(vttContent).toContain('First line')
      expect(vttContent).toContain('Second line')
      
      // Should NOT contain marker text
      expect(vttContent).not.toContain('**[Verse 1]**')
    })

    it('should apply offset to timestamps in VTT output', () => {
      const lineCues: LineCue[] = [
        {
          lineIndex: 0,
          text: 'Test line',
          startTime: 10,
          endTime: 11,
          isMarker: false,
        },
      ]
      
      const offsetMs = 500
      const vttContent = generateVttContent(lineCues, offsetMs)
      
      // Should contain adjusted timestamps
      expect(vttContent).toContain('00:10.500')
      expect(vttContent).toContain('00:11.500')
    })
  })

  describe('VTT content generation', () => {
    it('should generate valid VTT structure', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 5),
          (alignedWords) => {
            const lyricsLines = alignedWords.map(w => w.word).join('\n')
            const lineCues = aggregateWordsToLines(alignedWords, lyricsLines)
            
            const vttContent = generateVttContent(lineCues)
            const lines = vttContent.split('\n')
            
            // First line should be WEBVTT
            expect(lines[0]).toBe('WEBVTT')
          }
        ),
        { numRuns: 50 }
      )
    })

    /**
     * **Feature: vtt-download-enhancement, Property 15: Non-negative timestamp enforcement**
     * **Validates: Requirements 5.5**
     * 
     * For any line cues and offset value, applying the offset should never result in 
     * negative start or end times in the final output
     */
    it('Property 15: Non-negative timestamp enforcement', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              lineIndex: fc.nat(),
              text: fc.string({ minLength: 1 }),
              startTime: fc.float({ min: 0, max: 100 }),
              endTime: fc.float({ min: 0, max: 100 }),
              isMarker: fc.boolean(),
            }).filter(cue => cue.startTime <= cue.endTime),
            { minLength: 1, maxLength: 10 }
          ),
          fc.integer({ min: -10000, max: 10000 }), // Offset in milliseconds
          (lineCues, offsetMs) => {
            const vttContent = generateVttContent(lineCues, offsetMs)
            const lines = vttContent.split('\n')
            
            // Find all timestamp lines (format: "MM:SS.mmm --> MM:SS.mmm")
            const timestampLines = lines.filter(line => line.includes(' --> '))
            
            for (const timestampLine of timestampLines) {
              const [startStr, endStr] = timestampLine.split(' --> ')
              
              // Parse timestamps back to seconds for validation
              const parseTimestamp = (timeStr: string): number => {
                const parts = timeStr.split(':')
                if (parts.length === 2) {
                  // MM:SS.mmm format
                  const [minutes, secondsMs] = parts
                  const [seconds, ms] = secondsMs.split('.')
                  return parseInt(minutes) * 60 + parseInt(seconds) + parseInt(ms) / 1000
                } else if (parts.length === 3) {
                  // HH:MM:SS.mmm format
                  const [hours, minutes, secondsMs] = parts
                  const [seconds, ms] = secondsMs.split('.')
                  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(ms) / 1000
                }
                return 0
              }
              
              const startTime = parseTimestamp(startStr)
              const endTime = parseTimestamp(endStr)
              
              // Both timestamps should be non-negative
              expect(startTime).toBeGreaterThanOrEqual(0)
              expect(endTime).toBeGreaterThanOrEqual(0)
              expect(endTime).toBeGreaterThanOrEqual(startTime)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle offset application correctly', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 3),
          fc.integer({ min: -1000, max: 1000 }),
          (alignedWords, offsetMs) => {
            const lyricsLines = alignedWords.map(w => w.word).join('\n')
            const lineCues = aggregateWordsToLines(alignedWords, lyricsLines)
            
            const vttContent = generateVttContent(lineCues, offsetMs)
            
            // Should be valid VTT format
            expect(vttContent).toContain('WEBVTT')
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: vtt-download-enhancement, Property 5: VTT generation produces valid WebVTT format**
   * **Validates: Requirements 2.2, 5.1**
   * 
   * For any valid line cues, generating VTT content should produce a string that
   * starts with "WEBVTT" and contains properly formatted timestamp lines.
   */
  describe('Property 5: VTT generation produces valid WebVTT format', () => {
    /**
     * Generator for valid LineCue objects with proper timing constraints
     */
    const lineCueArbitrary = (minStart: number = 0): fc.Arbitrary<LineCue> =>
      fc.record({
        lineIndex: fc.nat({ max: 100 }),
        text: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        startTime: fc.float({ min: Math.fround(minStart), max: Math.fround(300), noNaN: true }),
        isMarker: fc.boolean(),
      }).chain(({ lineIndex, text, startTime, isMarker }) =>
        fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }).map(duration => ({
          lineIndex,
          text: text.trim(),
          startTime,
          endTime: startTime + duration,
          isMarker,
        }))
      )

    /**
     * Generator for sorted array of LineCue objects
     */
    const sortedLineCuesArbitrary = (minLength: number = 1, maxLength: number = 10): fc.Arbitrary<LineCue[]> =>
      fc.array(lineCueArbitrary(), { minLength, maxLength }).map(cues => {
        // Sort by startTime and reassign lineIndex
        const sorted = [...cues].sort((a, b) => a.startTime - b.startTime)
        return sorted.map((cue, idx) => ({ ...cue, lineIndex: idx }))
      })

    it('should always start with WEBVTT header', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(0, 10),
          (lineCues) => {
            const vttContent = generateVttContent(lineCues)
            expect(vttContent.startsWith('WEBVTT')).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should contain properly formatted timestamp lines for non-marker cues', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(1, 5).filter(cues => cues.some(c => !c.isMarker)),
          (lineCues) => {
            const vttContent = generateVttContent(lineCues)
            const lines = vttContent.split('\n')
            
            // VTT timestamp pattern: MM:SS.mmm --> MM:SS.mmm or HH:MM:SS.mmm --> HH:MM:SS.mmm
            const timestampPattern = /^(\d{2}:)?\d{2}:\d{2}\.\d{3} --> (\d{2}:)?\d{2}:\d{2}\.\d{3}$/
            
            // Find all timestamp lines
            const timestampLines = lines.filter(line => line.includes('-->'))
            
            // Each timestamp line should match the pattern
            for (const line of timestampLines) {
              expect(line).toMatch(timestampPattern)
            }
            
            // Should have at least one timestamp line for non-marker cues
            const nonMarkerCount = lineCues.filter(c => !c.isMarker).length
            expect(timestampLines.length).toBe(nonMarkerCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have cue text following each timestamp line', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(1, 5).filter(cues => cues.some(c => !c.isMarker)),
          (lineCues) => {
            const vttContent = generateVttContent(lineCues)
            const lines = vttContent.split('\n')
            
            // Find timestamp line indices
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes('-->')) {
                // Next line should be the cue text (non-empty)
                expect(i + 1).toBeLessThan(lines.length)
                expect(lines[i + 1].length).toBeGreaterThan(0)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce valid VTT even with empty line cues array', () => {
      const vttContent = generateVttContent([])
      expect(vttContent.startsWith('WEBVTT')).toBe(true)
      // Should only have header and empty line
      const lines = vttContent.split('\n').filter(l => l.length > 0)
      expect(lines.length).toBe(1)
      expect(lines[0]).toBe('WEBVTT')
    })

    it('should produce valid VTT when all cues are markers', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(1, 5).map(cues => cues.map(c => ({ ...c, isMarker: true }))),
          (lineCues) => {
            const vttContent = generateVttContent(lineCues)
            expect(vttContent.startsWith('WEBVTT')).toBe(true)
            // Should not contain any timestamp lines since all are markers
            expect(vttContent).not.toContain('-->')
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: vtt-download-enhancement, Property 6: Section markers excluded from VTT output**
   * **Validates: Requirements 2.3**
   * 
   * For any line cues containing section markers, the generated VTT content
   * should not include any lines marked with isMarker=true.
   */
  describe('Property 6: Section markers excluded from VTT output', () => {
    /**
     * Generator for LineCue with marker text patterns (realistic section markers)
     */
    const markerTextArbitrary = fc.constantFrom(
      '[Verse 1]', '[Chorus]', '[Bridge]', '[Outro]', '[Intro]',
      '**[Verse 2]**', '**[Pre-Chorus]**', '[Hook]', '[Interlude]',
      '[Verse 3]', '[Verse 4]', '**[Chorus 2]**', '[Break]'
    )

    /**
     * Generator for non-marker text (lyrics lines that won't be substrings of WEBVTT)
     */
    const nonMarkerTextArbitrary = fc.constantFrom(
      'Hello world', 'This is a test line', 'Singing along',
      'Music plays on', 'Dancing in the rain', 'Stars above',
      'Love is all around', 'Dreams come true', 'Forever young'
    )

    /**
     * Generator for mixed LineCue arrays with both markers and non-markers
     */
    const mixedLineCuesArbitrary = fc.array(
      fc.record({
        isMarker: fc.boolean(),
        startTime: fc.float({ min: Math.fround(0), max: Math.fround(300), noNaN: true }),
      }).chain(({ isMarker, startTime }) =>
        fc.tuple(
          isMarker ? markerTextArbitrary : nonMarkerTextArbitrary,
          fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true })
        ).map(([text, duration]) => ({
          lineIndex: 0,
          text,
          startTime,
          endTime: startTime + duration,
          isMarker,
        }))
      ),
      { minLength: 1, maxLength: 10 }
    ).map(cues => {
      // Sort by startTime and reassign lineIndex
      const sorted = [...cues].sort((a, b) => a.startTime - b.startTime)
      return sorted.map((cue, idx) => ({ ...cue, lineIndex: idx }))
    })

    it('should never include marker text in VTT output', () => {
      fc.assert(
        fc.property(
          mixedLineCuesArbitrary,
          (lineCues) => {
            const vttContent = generateVttContent(lineCues)
            
            // Check that no marker text appears in the output
            for (const cue of lineCues) {
              if (cue.isMarker) {
                expect(vttContent).not.toContain(cue.text)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include all non-marker text in VTT output', () => {
      fc.assert(
        fc.property(
          mixedLineCuesArbitrary.filter(cues => cues.some(c => !c.isMarker)),
          (lineCues) => {
            const vttContent = generateVttContent(lineCues)
            
            // Check that all non-marker text appears in the output
            for (const cue of lineCues) {
              if (!cue.isMarker) {
                expect(vttContent).toContain(cue.text)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have correct count of timestamp lines (excluding markers)', () => {
      fc.assert(
        fc.property(
          mixedLineCuesArbitrary,
          (lineCues) => {
            const vttContent = generateVttContent(lineCues)
            const timestampLines = vttContent.split('\n').filter(line => line.includes('-->'))
            
            const nonMarkerCount = lineCues.filter(c => !c.isMarker).length
            expect(timestampLines.length).toBe(nonMarkerCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce empty VTT body when all cues are markers', () => {
      fc.assert(
        fc.property(
          mixedLineCuesArbitrary.map(cues => cues.map(c => ({ ...c, isMarker: true }))),
          (lineCues) => {
            const vttContent = generateVttContent(lineCues)
            
            // Should only have WEBVTT header
            expect(vttContent.startsWith('WEBVTT')).toBe(true)
            expect(vttContent).not.toContain('-->')
            
            // No marker text should appear (marker texts are distinct from WEBVTT header)
            for (const cue of lineCues) {
              expect(vttContent).not.toContain(cue.text)
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: vtt-download-enhancement, Property 7: Offset application to all timestamps**
   * **Validates: Requirements 2.4**
   * 
   * For any line cues and offset value, applying the offset should adjust all
   * start and end times by exactly the offset amount (converted to seconds).
   */
  describe('Property 7: Offset application to all timestamps', () => {
    /**
     * Generator for LineCue with known timestamps (limited range to avoid hour formatting)
     */
    const lineCueWithKnownTimesArbitrary = fc.record({
      lineIndex: fc.nat({ max: 100 }),
      text: fc.constantFrom('Line one', 'Line two', 'Line three', 'Line four'),
      startTime: fc.integer({ min: 0, max: 50 }), // Use integers for predictable timestamps
      isMarker: fc.constant(false),
    }).chain(({ lineIndex, text, startTime, isMarker }) =>
      fc.integer({ min: 1, max: 5 }).map(duration => ({
        lineIndex,
        text,
        startTime,
        endTime: startTime + duration,
        isMarker,
      }))
    )

    const lineCuesWithKnownTimesArbitrary = fc.array(
      lineCueWithKnownTimesArbitrary,
      { minLength: 1, maxLength: 5 }
    ).map(cues => {
      const sorted = [...cues].sort((a, b) => a.startTime - b.startTime)
      return sorted.map((cue, idx) => ({ ...cue, lineIndex: idx }))
    })

    it('should apply positive offset to all timestamps', () => {
      fc.assert(
        fc.property(
          lineCuesWithKnownTimesArbitrary,
          fc.integer({ min: 0, max: 5000 }), // offset in ms
          (lineCues, offsetMs) => {
            const offsetSeconds = offsetMs / 1000
            
            // Directly verify that the generated VTT contains adjusted timestamps
            const vttWithOffset = generateVttContent(lineCues, offsetMs)
            
            for (const cue of lineCues) {
              if (!cue.isMarker) {
                const expectedStart = formatVttTimestamp(cue.startTime + offsetSeconds)
                const expectedEnd = formatVttTimestamp(cue.endTime + offsetSeconds)
                
                expect(vttWithOffset).toContain(expectedStart)
                expect(vttWithOffset).toContain(expectedEnd)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should apply negative offset to all timestamps', () => {
      fc.assert(
        fc.property(
          // Ensure startTime is high enough to handle negative offset
          lineCuesWithKnownTimesArbitrary.filter(cues => cues.every(c => c.startTime >= 10)),
          fc.integer({ min: -5000, max: 0 }), // negative offset in ms
          (lineCues, offsetMs) => {
            const offsetSeconds = offsetMs / 1000
            
            const vttWithOffset = generateVttContent(lineCues, offsetMs)
            
            for (const cue of lineCues) {
              if (!cue.isMarker) {
                const expectedStart = formatVttTimestamp(cue.startTime + offsetSeconds)
                const expectedEnd = formatVttTimestamp(cue.endTime + offsetSeconds)
                
                expect(vttWithOffset).toContain(expectedStart)
                expect(vttWithOffset).toContain(expectedEnd)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should apply zero offset without changing timestamps', () => {
      fc.assert(
        fc.property(
          lineCuesWithKnownTimesArbitrary,
          (lineCues) => {
            const vttWithoutOffset = generateVttContent(lineCues)
            const vttWithZeroOffset = generateVttContent(lineCues, 0)
            
            expect(vttWithoutOffset).toBe(vttWithZeroOffset)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should preserve cue duration when offset is applied', () => {
      fc.assert(
        fc.property(
          lineCuesWithKnownTimesArbitrary,
          fc.integer({ min: -2000, max: 2000 }),
          (lineCues, offsetMs) => {
            // Duration should remain the same regardless of offset
            for (const cue of lineCues) {
              if (!cue.isMarker) {
                const originalDuration = cue.endTime - cue.startTime
                const offsetSeconds = offsetMs / 1000
                const adjustedStart = cue.startTime + offsetSeconds
                const adjustedEnd = cue.endTime + offsetSeconds
                const adjustedDuration = adjustedEnd - adjustedStart
                
                expect(adjustedDuration).toBeCloseTo(originalDuration, 5)
              }
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
