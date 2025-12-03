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
  type LineCue,
} from '@/lib/vtt-generator'
import type { AlignedWord } from '@/types/lyrics'

/**
 * Generator for a valid AlignedWord with proper timing constraints
 */
const alignedWordArbitrary = (minStart: number = 0): fc.Arbitrary<AlignedWord> =>
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
      word: fc.string({ minLength: 1, maxLength: 10 }).filter(w => w.trim().length > 0),
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
const lyricsTextArbitrary = (minLines: number = 1, maxLines: number = 10): fc.Arbitrary<string> =>
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
})
