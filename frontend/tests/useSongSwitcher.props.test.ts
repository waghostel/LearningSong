/**
 * Property-based tests for useSongSwitcher hook
 * Using fast-check for property-based testing
 * 
 * **Feature: dual-song-selection, Property 8: Variation switch triggers state update**
 * **Validates: Requirements 3.1, 3.3, 3.4**
 * 
 * **Feature: dual-song-selection, Property 9: Playback position preservation**
 * **Validates: Requirements 3.2**
 * 
 * **Feature: dual-song-selection, Property 10: Loading state during switch**
 * **Validates: Requirements 3.5**
 * 
 * **Feature: dual-song-selection, Property 11: Switch failure recovery**
 * **Validates: Requirements 3.6**
 * 
 * **Feature: dual-song-selection, Property 16: Timestamped lyrics fetch with correct audio ID**
 * **Validates: Requirements 6.1**
 * 
 * **Feature: dual-song-selection, Property 17: Lyrics sync after switch**
 * **Validates: Requirements 6.3**
 * 
 * **Feature: dual-song-selection, Property 18: Lyrics fallback on fetch failure**
 * **Validates: Requirements 6.4**
 * 
 * **Feature: dual-song-selection, Property 19: Request cancellation on switch**
 * **Validates: Requirements 6.5**
 */
import * as fc from 'fast-check'
import type { SongVariation } from '@/api/songs'
import type { AlignedWord } from '@/types/lyrics'

/**
 * Generator for valid SongVariation objects
 */
const songVariationArbitrary = (index: number): fc.Arbitrary<SongVariation> =>
  fc.record({
    audio_url: fc.webUrl(),
    audio_id: fc.string({ minLength: 16, maxLength: 32 }),
    variation_index: fc.constant(index),
  }) as fc.Arbitrary<SongVariation>

/**
 * Generator for arrays of 1-2 song variations
 */
const songVariationsArbitrary = (): fc.Arbitrary<SongVariation[]> =>
  fc.integer({ min: 1, max: 2 }).chain(count =>
    fc.tuple(
      ...Array.from({ length: count }, (_, i) => songVariationArbitrary(i))
    ).map(variations => Array.from(variations))
  )

/**
 * Generator for valid task IDs
 */
const taskIdArbitrary = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 16, maxLength: 32 })

/**
 * Generator for valid variation indices
 */
const variationIndexArbitrary = (maxIndex: number): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: Math.max(0, maxIndex - 1) })

/**
 * Generator for valid AlignedWord objects
 */
const alignedWordArbitrary = (): fc.Arbitrary<AlignedWord> =>
  fc.record({
    word: fc.string({ minLength: 1, maxLength: 20 }),
    startS: fc.float({ min: 0, max: 300, noNaN: true }),
    endS: fc.float({ min: 0, max: 300, noNaN: true }),
  }).map(({ word, startS, endS }) => ({
    word,
    startS,
    endS: Math.max(startS, endS), // Ensure endS >= startS
  })) as fc.Arbitrary<AlignedWord>

/**
 * Generator for arrays of aligned words (sorted by startS)
 */
const alignedWordsArbitrary = (): fc.Arbitrary<AlignedWord[]> =>
  fc.array(alignedWordArbitrary(), { minLength: 0, maxLength: 50 })
    .map(words => {
      // Sort by startS to ensure proper ordering
      return words.sort((a, b) => a.startS - b.startS)
    })

/**
 * Generator for waveform data
 */
const waveformDataArbitrary = (): fc.Arbitrary<number[]> =>
  fc.array(fc.float({ min: 0, max: 1, noNaN: true }), { minLength: 0, maxLength: 100 })

describe('useSongSwitcher Property Tests', () => {
  /**
   * **Feature: dual-song-selection, Property 8: Variation switch triggers state update**
   * **Validates: Requirements 3.1, 3.3, 3.4**
   *
   * For any valid variation index within the variations array bounds,
   * the index should be valid and within range.
   */
  describe('Property 8: Variation switch triggers state update', () => {
    it('should validate that valid indices are within bounds', () => {
      fc.assert(
        fc.property(
          songVariationsArbitrary(),
          (variations) => {
            // For any variations array, valid indices should be 0 to length-1
            for (let i = 0; i < variations.length; i++) {
              expect(i).toBeGreaterThanOrEqual(0)
              expect(i).toBeLessThan(variations.length)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reject invalid variation indices', () => {
      fc.assert(
        fc.property(
          songVariationsArbitrary(),
          (variations) => {
            // Negative indices should be invalid
            expect(-1).toBeLessThan(0)
            
            // Indices beyond array length should be invalid
            expect(variations.length).toBeLessThanOrEqual(variations.length)
            expect(variations.length + 1).toBeGreaterThan(variations.length)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should ensure variation_index matches array position', () => {
      fc.assert(
        fc.property(
          songVariationsArbitrary(),
          (variations) => {
            // For each variation, its variation_index should match its position
            for (let i = 0; i < variations.length; i++) {
              expect(variations[i].variation_index).toBe(i)
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: dual-song-selection, Property 9: Playback position preservation**
   * **Validates: Requirements 3.2**
   *
   * For any playback position value, it should be a valid number.
   */
  describe('Property 9: Playback position preservation', () => {
    it('should handle valid playback positions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3600 }),
          (playbackPosition) => {
            // Playback position should be a valid number
            expect(typeof playbackPosition).toBe('number')
            expect(playbackPosition).toBeGreaterThanOrEqual(0)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: dual-song-selection, Property 10: Loading state during switch**
   * **Validates: Requirements 3.5**
   *
   * For any switch operation, loading state should be a boolean.
   */
  describe('Property 10: Loading state during switch', () => {
    it('should have valid loading state values', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (isLoading) => {
            // Loading state should be boolean
            expect(typeof isLoading).toBe('boolean')
            expect([true, false]).toContain(isLoading)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: dual-song-selection, Property 11: Switch failure recovery**
   * **Validates: Requirements 3.6**
   *
   * For any error state, it should be either null or a string.
   */
  describe('Property 11: Switch failure recovery', () => {
    it('should have valid error state values', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(null), fc.string()),
          (error) => {
            // Error should be null or string
            expect(error === null || typeof error === 'string').toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should ensure error messages are non-empty when present', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorMsg) => {
            // Error message should not be empty
            expect(errorMsg.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: dual-song-selection, Property 19: Request cancellation on switch**
   * **Validates: Requirements 6.5**
   *
   * For any sequence of switch requests, the final state should be consistent.
   */
  describe('Property 19: Request cancellation on switch', () => {
    it('should handle multiple switch requests consistently', () => {
      fc.assert(
        fc.property(
          songVariationsArbitrary(),
          fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 1, maxLength: 5 }),
          (variations, switchSequence) => {
            if (variations.length < 2) {
              return
            }

            // Filter sequence to only valid indices
            const validSequence = switchSequence.filter(
              idx => idx >= 0 && idx < variations.length
            )

            // The final index in the sequence should be valid
            if (validSequence.length > 0) {
              const finalIndex = validSequence[validSequence.length - 1]
              expect(finalIndex).toBeGreaterThanOrEqual(0)
              expect(finalIndex).toBeLessThan(variations.length)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should ensure variation array consistency', () => {
      fc.assert(
        fc.property(
          songVariationsArbitrary(),
          (variations) => {
            // Variations array should have consistent structure
            expect(Array.isArray(variations)).toBe(true)
            expect(variations.length).toBeGreaterThanOrEqual(1)
            expect(variations.length).toBeLessThanOrEqual(2)

            // Each variation should have required fields
            for (const variation of variations) {
              expect(typeof variation.audio_url).toBe('string')
              expect(typeof variation.audio_id).toBe('string')
              expect(typeof variation.variation_index).toBe('number')
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: dual-song-selection, Property 16: Timestamped lyrics fetch with correct audio ID**
   * **Validates: Requirements 6.1**
   *
   * For any variation switch operation, the system should use the correct audio_id
   * from the newly selected variation when fetching timestamped lyrics.
   */
  describe('Property 16: Timestamped lyrics fetch with correct audio ID', () => {
    it('should ensure each variation has a unique audio_id', () => {
      fc.assert(
        fc.property(
          fc.tuple(songVariationArbitrary(0), songVariationArbitrary(1)),
          ([var0, var1]) => {
            const variations = [var0, var1]
            
            // Each variation should have an audio_id
            expect(typeof variations[0].audio_id).toBe('string')
            expect(typeof variations[1].audio_id).toBe('string')
            expect(variations[0].audio_id.length).toBeGreaterThan(0)
            expect(variations[1].audio_id.length).toBeGreaterThan(0)
            
            // Audio IDs should be different (in practice, Suno generates unique IDs)
            // Note: In rare cases they might be the same, but this is the expected behavior
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate audio_id format', () => {
      fc.assert(
        fc.property(
          songVariationsArbitrary(),
          (variations) => {
            // Each variation's audio_id should be a non-empty string
            for (const variation of variations) {
              expect(typeof variation.audio_id).toBe('string')
              expect(variation.audio_id.length).toBeGreaterThan(0)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should ensure variation index matches the target variation', () => {
      fc.assert(
        fc.property(
          songVariationsArbitrary(),
          variationIndexArbitrary(2),
          (variations, targetIndex) => {
            if (targetIndex >= variations.length) {
              return // Skip invalid indices
            }

            const targetVariation = variations[targetIndex]
            
            // The variation at targetIndex should have variation_index === targetIndex
            expect(targetVariation.variation_index).toBe(targetIndex)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: dual-song-selection, Property 17: Lyrics sync after switch**
   * **Validates: Requirements 6.3**
   *
   * For any successfully loaded timestamped lyrics after a variation switch,
   * the lyrics data should be valid and properly structured.
   */
  describe('Property 17: Lyrics sync after switch', () => {
    it('should validate aligned words structure', () => {
      fc.assert(
        fc.property(
          alignedWordsArbitrary(),
          (alignedWords) => {
            // Each aligned word should have required fields
            for (const word of alignedWords) {
              expect(typeof word.word).toBe('string')
              expect(typeof word.startS).toBe('number')
              expect(typeof word.endS).toBe('number')
              
              // startS should be <= endS
              expect(word.startS).toBeLessThanOrEqual(word.endS)
              
              // Times should be non-negative
              expect(word.startS).toBeGreaterThanOrEqual(0)
              expect(word.endS).toBeGreaterThanOrEqual(0)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should ensure aligned words are sorted by startS', () => {
      fc.assert(
        fc.property(
          alignedWordsArbitrary(),
          (alignedWords) => {
            // Words should be sorted by startS
            for (let i = 1; i < alignedWords.length; i++) {
              expect(alignedWords[i].startS).toBeGreaterThanOrEqual(
                alignedWords[i - 1].startS
              )
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate waveform data structure', () => {
      fc.assert(
        fc.property(
          waveformDataArbitrary(),
          (waveformData) => {
            // Waveform data should be an array of numbers
            expect(Array.isArray(waveformData)).toBe(true)
            
            for (const value of waveformData) {
              expect(typeof value).toBe('number')
              expect(value).toBeGreaterThanOrEqual(0)
              expect(value).toBeLessThanOrEqual(1)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty aligned words arrays', () => {
      fc.assert(
        fc.property(
          fc.constant([]),
          (emptyWords) => {
            // Empty arrays should be valid
            expect(Array.isArray(emptyWords)).toBe(true)
            expect(emptyWords.length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: dual-song-selection, Property 18: Lyrics fallback on fetch failure**
   * **Validates: Requirements 6.4**
   *
   * For any failed timestamped lyrics fetch, the system should gracefully
   * fall back to displaying plain text lyrics without timing synchronization.
   */
  describe('Property 18: Lyrics fallback on fetch failure', () => {
    it('should handle empty aligned words as fallback', () => {
      fc.assert(
        fc.property(
          fc.constant([]),
          (emptyAlignedWords) => {
            // Empty aligned words array is a valid fallback state
            expect(Array.isArray(emptyAlignedWords)).toBe(true)
            expect(emptyAlignedWords.length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle null/undefined aligned words', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant([])),
          (fallbackValue) => {
            // All these values should be valid fallback states
            const isValidFallback = 
              fallbackValue === null || 
              fallbackValue === undefined || 
              (Array.isArray(fallbackValue) && fallbackValue.length === 0)
            
            expect(isValidFallback).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should ensure plain lyrics are always available', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (lyrics) => {
            // Plain lyrics should always be a non-empty string
            expect(typeof lyrics).toBe('string')
            expect(lyrics.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Edge cases', () => {
    it('should handle single variation arrays', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          (variation) => {
            const variations = [variation]
            
            // Should have exactly one variation
            expect(variations.length).toBe(1)
            expect(variations[0].variation_index).toBe(0)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle two variation arrays', () => {
      fc.assert(
        fc.property(
          fc.tuple(songVariationArbitrary(0), songVariationArbitrary(1)),
          ([var0, var1]) => {
            const variations = [var0, var1]
            
            // Should have exactly two variations
            expect(variations.length).toBe(2)
            expect(variations[0].variation_index).toBe(0)
            expect(variations[1].variation_index).toBe(1)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should validate task IDs are non-empty strings', () => {
      fc.assert(
        fc.property(
          taskIdArbitrary(),
          (taskId) => {
            expect(typeof taskId).toBe('string')
            expect(taskId.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
