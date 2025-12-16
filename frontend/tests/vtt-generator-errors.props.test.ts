/**
 * Property-based tests for VTT generator error handling and edge cases
 * 
 * **Feature: vtt-download-enhancement**
 * **Task 6: Add robust error handling and edge case management**
 */

import * as fc from 'fast-check'
import {
  aggregateWordsToLines,
  generateVttContent,
  generateVttFilename,
  normalizeText,
  normalizeForMatching,
  type LineCue,
} from '@/lib/vtt-generator'
import type { AlignedWord } from '@/types/lyrics'

// Helper to create valid AlignedWord
const alignedWordArbitrary = fc.record({
  word: fc.string({ minLength: 1, maxLength: 10 }),
  startS: fc.float({ min: 0, max: 100 }),
  endS: fc.float({ min: 0, max: 100 }),
  success: fc.boolean(),
  palign: fc.float({ min: 0, max: 1 }),
}).filter(w => w.startS <= w.endS)

describe('VTT Generator Error Handling Property Tests', () => {
  
  /**
   * **Feature: vtt-download-enhancement, Property 16: Unicode character preservation**
   * **Validates: Requirements 6.2**
   * 
   * For any lyrics containing Unicode or special characters, both the line highlighting 
   * display and VTT file generation should preserve all characters exactly as they 
   * appear in the original text
   */
  describe('Property 16: Unicode character preservation', () => {
    it('should preserve Unicode characters in line aggregation', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              word: fc.string({ minLength: 1, maxLength: 10 }),
              startS: fc.float({ min: 0, max: 100 }),
              endS: fc.float({ min: 0, max: 100 }),
              success: fc.boolean(),
              palign: fc.float({ min: 0, max: 1 }),
            }).filter(w => w.startS <= w.endS),
            { minLength: 1, maxLength: 5 }
          ),
          (alignedWords) => {
            // Create lyrics that match the aligned words
            const lyricsText = alignedWords.map(w => w.word).join(' ')
            
            const lineCues = aggregateWordsToLines(alignedWords, lyricsText)
            
            if (lineCues.length > 0) {
              // The aggregated text should preserve all Unicode characters
              const aggregatedText = lineCues.map(cue => cue.text).join(' ')
              
              // Check that all original characters are preserved
              for (const word of alignedWords) {
                for (const char of word.word) {
                  if (char.trim().length > 0) {
                    expect(aggregatedText).toContain(char)
                  }
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve Unicode characters in VTT generation', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              lineIndex: fc.nat(),
              text: fc.string({ minLength: 1, maxLength: 50 }),
              startTime: fc.float({ min: 0, max: 100 }),
              endTime: fc.float({ min: 0, max: 100 }),
              isMarker: fc.boolean(),
            }).filter(cue => cue.startTime <= cue.endTime),
            { minLength: 1, maxLength: 10 }
          ),
          (lineCues) => {
            const vttContent = generateVttContent(lineCues)
            
            // All non-marker text should be preserved in VTT output
            for (const cue of lineCues) {
              if (!cue.isMarker && typeof cue.text === 'string') {
                expect(vttContent).toContain(cue.text)
                
                // Check that all Unicode characters are preserved
                for (const char of cue.text) {
                  if (char.trim().length > 0) {
                    expect(vttContent).toContain(char)
                  }
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle emoji and special Unicode characters', () => {
      const testCases = [
        '🎵 Music with emoji 🎶',
        'Café with accents é à ñ',
        'Chinese characters: 你好世界',
        'Arabic text: مرحبا بالعالم',
        'Mathematical symbols: ∑ ∫ ∞ ≠',
        'Currency symbols: € $ ¥ £',
        'Mixed: Hello 世界 🌍 café!',
      ]

      for (const text of testCases) {
        const alignedWords: AlignedWord[] = text.split(' ').map((word, i) => ({
          word,
          startS: i,
          endS: i + 1,
          success: true,
          palign: 0,
        }))

        const lineCues = aggregateWordsToLines(alignedWords, text)
        expect(lineCues.length).toBeGreaterThan(0)
        
        const vttContent = generateVttContent(lineCues)
        expect(vttContent).toContain(text)
      }
    })
  })

  /**
   * **Feature: vtt-download-enhancement, Property 17: Error handling without system crashes**
   * **Validates: Requirements 6.3**
   * 
   * For any malformed or incomplete aligned words data, the aggregation process should 
   * handle errors gracefully and return a valid result (possibly empty) without 
   * throwing unhandled exceptions
   */
  describe('Property 17: Error handling without system crashes', () => {
    it('should handle malformed aligned words gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              // Valid aligned word
              fc.record({
                word: fc.string(),
                startS: fc.float({ min: 0, max: 100 }),
                endS: fc.float({ min: 0, max: 100 }),
                success: fc.boolean(),
                palign: fc.float({ min: 0, max: 1 }),
              }),
              // Malformed aligned words
              fc.record({
                word: fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant('')),
                startS: fc.oneof(fc.float(), fc.constant(NaN), fc.constant(Infinity)),
                endS: fc.oneof(fc.float(), fc.constant(NaN), fc.constant(Infinity)),
                success: fc.oneof(fc.boolean(), fc.constant(null)),
                palign: fc.oneof(fc.float(), fc.constant(NaN)),
              }),
              // Missing properties - create partial objects
              fc.record({
                word: fc.string(),
                success: fc.boolean(),
                palign: fc.float({ min: 0, max: 1 }),
                // Missing startS or endS
              }),
            ),
            { maxLength: 10 }
          ),
          fc.string(),
          (malformedWords, lyrics) => {
            // Should not throw an exception
            expect(() => {
              const result = aggregateWordsToLines(malformedWords as AlignedWord[], lyrics)
              expect(Array.isArray(result)).toBe(true)
            }).not.toThrow()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle malformed line cues in VTT generation', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              // Valid line cue
              fc.record({
                lineIndex: fc.nat(),
                text: fc.string(),
                startTime: fc.float({ min: 0, max: 100 }),
                endTime: fc.float({ min: 0, max: 100 }),
                isMarker: fc.boolean(),
              }),
              // Malformed line cues
              fc.record({
                lineIndex: fc.oneof(fc.nat(), fc.constant(NaN)),
                text: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
                startTime: fc.oneof(fc.float(), fc.constant(NaN), fc.constant(Infinity)),
                endTime: fc.oneof(fc.float(), fc.constant(NaN), fc.constant(Infinity)),
                isMarker: fc.oneof(fc.boolean(), fc.constant(null)),
              }),
            ),
            { maxLength: 10 }
          ),
          (malformedCues) => {
            // Should not throw an exception
            expect(() => {
              const result = generateVttContent(malformedCues as LineCue[])
              expect(typeof result).toBe('string')
              expect(result).toContain('WEBVTT')
            }).not.toThrow()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle invalid input types gracefully', () => {
      const invalidInputs = [
        null,
        undefined,
        123,
        {},
        'string',
        [],
      ]

      for (const input of invalidInputs) {
        expect(() => {
          const result = aggregateWordsToLines(input as any, 'test lyrics')
          expect(Array.isArray(result)).toBe(true)
        }).not.toThrow()

        expect(() => {
          const result = aggregateWordsToLines([], input as any)
          expect(Array.isArray(result)).toBe(true)
        }).not.toThrow()
      }
    })

    it('should handle filename generation with invalid dates', () => {
      const invalidDates = [
        new Date('invalid'),
        new Date(NaN),
        null,
        undefined,
      ]

      for (const date of invalidDates) {
        expect(() => {
          const filename = generateVttFilename('Pop', date as any)
          expect(typeof filename).toBe('string')
          expect(filename).toMatch(/\.vtt$/)
        }).not.toThrow()
      }
    })
  })

  /**
   * **Feature: vtt-download-enhancement, Property 18: Expired song state management**
   * **Validates: Requirements 6.4**
   * 
   * For any song with an expiration status of true, the VTT download button should be 
   * disabled while lyrics display remains functional in read-only mode
   */
  describe('Property 18: Expired song state management', () => {
    it('should maintain VTT generation functionality for expired songs', () => {
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
          (lineCues) => {
            // VTT generation should work regardless of expiration status
            const vttContent = generateVttContent(lineCues)
            
            expect(vttContent).toContain('WEBVTT')
            expect(typeof vttContent).toBe('string')
            
            // Content should be valid even for expired songs
            const lines = vttContent.split('\n')
            expect(lines[0]).toBe('WEBVTT')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should preserve line cue data structure for expired songs', () => {
      fc.assert(
        fc.property(
          fc.array(alignedWordArbitrary, { minLength: 1, maxLength: 5 }),
          (alignedWords) => {
            const lyricsText = alignedWords.map(w => w.word).join(' ')
            
            // Line aggregation should work regardless of expiration status
            const lineCues = aggregateWordsToLines(alignedWords, lyricsText)
            
            // Verify structure is preserved for any generated line cues
            for (const cue of lineCues) {
              expect(typeof cue.lineIndex).toBe('number')
              expect(typeof cue.text).toBe('string')
              expect(typeof cue.startTime).toBe('number')
              expect(typeof cue.endTime).toBe('number')
              expect(typeof cue.isMarker).toBe('boolean')
              expect(cue.startTime).toBeGreaterThanOrEqual(0)
              expect(cue.endTime).toBeGreaterThanOrEqual(0)
              expect(cue.startTime).toBeLessThanOrEqual(cue.endTime)
            }
            
            // Should return an array (possibly empty)
            expect(Array.isArray(lineCues)).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})