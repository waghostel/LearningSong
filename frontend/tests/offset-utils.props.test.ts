/**
 * Property-based tests for offset utility functions
 * Using fast-check for property-based testing
 * 
 * **Feature: song-playback-improvements, Property 4: Offset application to timestamps**
 * **Validates: Requirements 2.1**
 * 
 * **Feature: song-playback-improvements, Property 5: Offset range constraint**
 * **Validates: Requirements 2.6**
 * 
 * **Feature: song-playback-improvements, Property 6: Offset increment/decrement**
 * **Validates: Requirements 3.3, 3.4**
 */
import * as fc from 'fast-check'
import {
  applyOffset,
  clampOffset,
  formatOffsetDisplay,
  incrementOffset,
  decrementOffset,
  OFFSET_MIN,
  OFFSET_MAX,
  OFFSET_STEP,
} from '@/lib/offset-utils'
import type { AlignedWord } from '@/types/lyrics'

/**
 * Generator for a valid AlignedWord with proper timing constraints
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _alignedWordArbitrary = (minStart: number = 0): fc.Arbitrary<AlignedWord> =>
  fc.record({
    word: fc.string({ minLength: 1, maxLength: 50 }),
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
 */
const sortedAlignedWordsArbitrary = (minLength: number = 1, maxLength: number = 20): fc.Arbitrary<AlignedWord[]> =>
  fc.array(
    fc.record({
      word: fc.string({ minLength: 1, maxLength: 10 }),
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
      words.push({
        word: item.word,
        startS: currentTime,
        endS: currentTime + duration,
        success: item.success,
        palign: item.palign,
      })
      currentTime += duration + gap
    }
    
    return words
  })

describe('Offset Utils Property Tests', () => {
  /**
   * **Feature: song-playback-improvements, Property 4: Offset application to timestamps**
   * **Validates: Requirements 2.1**
   * 
   * For any aligned word with startS and endS, and any offset value O (in milliseconds),
   * the effective timestamps used for highlighting should be (startS + O/1000) and (endS + O/1000).
   */
  describe('Property 4: Offset application to timestamps', () => {
    it('should apply offset correctly to all word timestamps', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 10),
          fc.integer({ min: -2000, max: 2000 }),
          (words, offsetMs) => {
            const result = applyOffset(words, offsetMs)
            const offsetSeconds = offsetMs / 1000
            
            // Result should have same length
            expect(result.length).toBe(words.length)
            
            // Each word should have offset applied
            for (let i = 0; i < words.length; i++) {
              expect(result[i].startS).toBeCloseTo(words[i].startS + offsetSeconds, 10)
              expect(result[i].endS).toBeCloseTo(words[i].endS + offsetSeconds, 10)
              // Other properties should be unchanged
              expect(result[i].word).toBe(words[i].word)
              expect(result[i].success).toBe(words[i].success)
              expect(result[i].palign).toBe(words[i].palign)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array for empty input', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -2000, max: 2000 }),
          (offsetMs) => {
            const result = applyOffset([], offsetMs)
            expect(result).toEqual([])
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should preserve word order after applying offset', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(2, 10),
          fc.integer({ min: -2000, max: 2000 }),
          (words, offsetMs) => {
            const result = applyOffset(words, offsetMs)
            
            // Words should remain in the same order
            for (let i = 0; i < result.length - 1; i++) {
              expect(result[i].startS).toBeLessThanOrEqual(result[i + 1].startS)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should preserve word duration after applying offset', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 10),
          fc.integer({ min: -2000, max: 2000 }),
          (words, offsetMs) => {
            const result = applyOffset(words, offsetMs)
            
            // Duration of each word should be preserved
            for (let i = 0; i < words.length; i++) {
              const originalDuration = words[i].endS - words[i].startS
              const resultDuration = result[i].endS - result[i].startS
              expect(resultDuration).toBeCloseTo(originalDuration, 10)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should not mutate original array', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 5),
          fc.integer({ min: -2000, max: 2000 }),
          (words, offsetMs) => {
            // Deep copy original values
            const originalStartS = words.map(w => w.startS)
            const originalEndS = words.map(w => w.endS)
            
            applyOffset(words, offsetMs)
            
            // Original array should be unchanged
            for (let i = 0; i < words.length; i++) {
              expect(words[i].startS).toBe(originalStartS[i])
              expect(words[i].endS).toBe(originalEndS[i])
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle zero offset as identity', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 10),
          (words) => {
            const result = applyOffset(words, 0)
            
            // With zero offset, timestamps should be identical
            for (let i = 0; i < words.length; i++) {
              expect(result[i].startS).toBe(words[i].startS)
              expect(result[i].endS).toBe(words[i].endS)
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: song-playback-improvements, Property 5: Offset range constraint**
   * **Validates: Requirements 2.6**
   * 
   * For any offset adjustment attempt, the resulting offset should be clamped
   * to the range [-2000, 2000] milliseconds.
   */
  describe('Property 5: Offset range constraint', () => {
    it('should clamp offset to valid range', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10000, max: 10000 }),
          (rawOffset) => {
            const clamped = clampOffset(rawOffset)
            expect(clamped).toBeGreaterThanOrEqual(OFFSET_MIN)
            expect(clamped).toBeLessThanOrEqual(OFFSET_MAX)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve values within valid range', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: OFFSET_MIN, max: OFFSET_MAX }),
          (validOffset) => {
            const clamped = clampOffset(validOffset)
            expect(clamped).toBe(validOffset)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should clamp values below minimum to minimum', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10000, max: OFFSET_MIN - 1 }),
          (belowMin) => {
            const clamped = clampOffset(belowMin)
            expect(clamped).toBe(OFFSET_MIN)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should clamp values above maximum to maximum', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: OFFSET_MAX + 1, max: 10000 }),
          (aboveMax) => {
            const clamped = clampOffset(aboveMax)
            expect(clamped).toBe(OFFSET_MAX)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should respect custom min/max bounds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -5000, max: 5000 }),
          fc.integer({ min: -3000, max: -1000 }),
          fc.integer({ min: 1000, max: 3000 }),
          (value, customMin, customMax) => {
            const clamped = clampOffset(value, customMin, customMax)
            expect(clamped).toBeGreaterThanOrEqual(customMin)
            expect(clamped).toBeLessThanOrEqual(customMax)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: song-playback-improvements, Property 6: Offset increment/decrement**
   * **Validates: Requirements 3.3, 3.4**
   * 
   * For any click on the minus button, the offset should decrease by exactly 50ms
   * (unless at minimum); for plus button, increase by exactly 50ms (unless at maximum).
   */
  describe('Property 6: Offset increment/decrement', () => {
    it('should increment by step unless at maximum', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: OFFSET_MIN, max: OFFSET_MAX - OFFSET_STEP }),
          (currentOffset) => {
            const result = incrementOffset(currentOffset)
            expect(result).toBe(currentOffset + OFFSET_STEP)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not exceed maximum when incrementing', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: OFFSET_MAX - OFFSET_STEP + 1, max: OFFSET_MAX }),
          (currentOffset) => {
            const result = incrementOffset(currentOffset)
            expect(result).toBe(OFFSET_MAX)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should decrement by step unless at minimum', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: OFFSET_MIN + OFFSET_STEP, max: OFFSET_MAX }),
          (currentOffset) => {
            const result = decrementOffset(currentOffset)
            expect(result).toBe(currentOffset - OFFSET_STEP)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not go below minimum when decrementing', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: OFFSET_MIN, max: OFFSET_MIN + OFFSET_STEP - 1 }),
          (currentOffset) => {
            const result = decrementOffset(currentOffset)
            expect(result).toBe(OFFSET_MIN)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should respect custom step size', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: OFFSET_MIN, max: 0 }),
          fc.integer({ min: 10, max: 200 }),
          (currentOffset, customStep) => {
            const incremented = incrementOffset(currentOffset, customStep)
            const decremented = decrementOffset(currentOffset, customStep)
            
            // Increment should add step (clamped to max)
            expect(incremented).toBe(Math.min(currentOffset + customStep, OFFSET_MAX))
            
            // Decrement should subtract step (clamped to min)
            expect(decremented).toBe(Math.max(currentOffset - customStep, OFFSET_MIN))
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should be idempotent at boundaries', () => {
      // At maximum, increment should return maximum
      expect(incrementOffset(OFFSET_MAX)).toBe(OFFSET_MAX)
      
      // At minimum, decrement should return minimum
      expect(decrementOffset(OFFSET_MIN)).toBe(OFFSET_MIN)
    })
  })

  describe('formatOffsetDisplay', () => {
    it('should format positive offsets with plus sign', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2000 }),
          (offset) => {
            const formatted = formatOffsetDisplay(offset)
            expect(formatted).toBe(`+${offset}ms`)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should format negative offsets with minus sign', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -2000, max: -1 }),
          (offset) => {
            const formatted = formatOffsetDisplay(offset)
            expect(formatted).toBe(`${offset}ms`)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should format zero without sign', () => {
      expect(formatOffsetDisplay(0)).toBe('0ms')
    })
  })
})
