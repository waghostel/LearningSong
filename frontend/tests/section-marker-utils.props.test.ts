/**
 * Property-based tests for section marker utility functions
 * Using fast-check for property-based testing
 * 
 * **Feature: song-playback-improvements, Property 18: Section marker detection**
 * **Validates: Requirements 13.1, 13.2**
 */
import * as fc from 'fast-check'
import {
  isSectionMarker,
  classifyAlignedWords,
  findNextNonMarkerIndex,
  hasMarkers,
} from '@/lib/section-marker-utils'
import type { AlignedWord } from '@/types/lyrics'

/**
 * Generator for section marker strings
 */
const sectionMarkerArbitrary = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant('**[Verse 1]**'),
    fc.constant('**[Chorus]**'),
    fc.constant('**[Bridge]**'),
    fc.constant('**[Verse 2]**'),
    fc.constant('**[Outro]**'),
    fc.constant('**Verse**'),
    fc.constant('**Chorus**'),
    fc.string({ minLength: 1, maxLength: 20 }).map(s => `**${s}**`)
  )

/**
 * Generator for non-marker strings (regular lyrics)
 */
const nonMarkerArbitrary = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.startsWith('**') || !s.endsWith('**')),
    fc.constant('Hello'),
    fc.constant('world'),
    fc.constant('singing'),
    fc.constant('**incomplete'),
    fc.constant('incomplete**'),
    fc.constant('***'),
    fc.constant('**')
  )

/**
 * Generator for AlignedWord with section marker
 */
const markerWordArbitrary = (): fc.Arbitrary<AlignedWord> =>
  fc.record({
    word: sectionMarkerArbitrary(),
    startS: fc.float({ min: 0, max: 300 }),
    success: fc.boolean(),
    palign: fc.float({ min: 0, max: 1 }),
  }).chain(({ word, startS, success, palign }) =>
    fc.float({ min: Math.fround(0.1), max: 5 }).map(duration => ({
      word,
      startS,
      endS: startS + duration,
      success,
      palign,
    }))
  )

/**
 * Generator for AlignedWord with regular lyric
 */
const lyricWordArbitrary = (): fc.Arbitrary<AlignedWord> =>
  fc.record({
    word: nonMarkerArbitrary(),
    startS: fc.float({ min: 0, max: 300 }),
    success: fc.boolean(),
    palign: fc.float({ min: 0, max: 1 }),
  }).chain(({ word, startS, success, palign }) =>
    fc.float({ min: Math.fround(0.1), max: 5 }).map(duration => ({
      word,
      startS,
      endS: startS + duration,
      success,
      palign,
    }))
  )

/**
 * Generator for mixed array of markers and lyrics
 */
const mixedAlignedWordsArbitrary = (minLength: number = 1, maxLength: number = 20): fc.Arbitrary<AlignedWord[]> =>
  fc.array(
    fc.oneof(markerWordArbitrary(), lyricWordArbitrary()),
    { minLength, maxLength }
  )

describe('Section Marker Utils Property Tests', () => {
  /**
   * **Feature: song-playback-improvements, Property 18: Section marker detection**
   * **Validates: Requirements 13.1, 13.2**
   * 
   * For any aligned word with text matching the pattern **...** (text surrounded by double asterisks),
   * the system should classify it as a section marker.
   */
  describe('Property 18: Section marker detection', () => {
    it('should detect all section markers with ** pattern', () => {
      fc.assert(
        fc.property(
          sectionMarkerArbitrary(),
          (marker) => {
            expect(isSectionMarker(marker)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not detect non-markers as section markers', () => {
      fc.assert(
        fc.property(
          nonMarkerArbitrary(),
          (nonMarker) => {
            expect(isSectionMarker(nonMarker)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle whitespace correctly', () => {
      fc.assert(
        fc.property(
          sectionMarkerArbitrary(),
          fc.string({ minLength: 0, maxLength: 5 }).filter(s => /^\s*$/.test(s)),
          (marker, whitespace) => {
            // Marker with leading/trailing whitespace should still be detected
            const withWhitespace = whitespace + marker + whitespace
            expect(isSectionMarker(withWhitespace)).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should correctly classify mixed aligned words', () => {
      fc.assert(
        fc.property(
          mixedAlignedWordsArbitrary(1, 20),
          (words) => {
            const { markers, lyrics } = classifyAlignedWords(words)
            
            // Total should equal original length
            expect(markers.length + lyrics.length).toBe(words.length)
            
            // All markers should be detected as markers
            for (const marker of markers) {
              expect(isSectionMarker(marker.word)).toBe(true)
            }
            
            // All lyrics should not be markers
            for (const lyric of lyrics) {
              expect(isSectionMarker(lyric.word)).toBe(false)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve word order in classification', () => {
      fc.assert(
        fc.property(
          mixedAlignedWordsArbitrary(2, 20),
          (words) => {
            const { markers, lyrics } = classifyAlignedWords(words)
            
            // Markers should appear in same relative order
            let markerIndex = 0
            let lyricIndex = 0
            
            for (const word of words) {
              if (isSectionMarker(word.word)) {
                expect(markers[markerIndex]).toBe(word)
                markerIndex++
              } else {
                expect(lyrics[lyricIndex]).toBe(word)
                lyricIndex++
              }
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle empty array', () => {
      const { markers, lyrics } = classifyAlignedWords([])
      expect(markers).toEqual([])
      expect(lyrics).toEqual([])
    })

    it('should handle all markers', () => {
      fc.assert(
        fc.property(
          fc.array(markerWordArbitrary(), { minLength: 1, maxLength: 10 }),
          (allMarkers) => {
            const { markers, lyrics } = classifyAlignedWords(allMarkers)
            expect(markers.length).toBe(allMarkers.length)
            expect(lyrics.length).toBe(0)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle all lyrics', () => {
      fc.assert(
        fc.property(
          fc.array(lyricWordArbitrary(), { minLength: 1, maxLength: 10 }),
          (allLyrics) => {
            const { markers, lyrics } = classifyAlignedWords(allLyrics)
            expect(markers.length).toBe(0)
            expect(lyrics.length).toBe(allLyrics.length)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('findNextNonMarkerIndex', () => {
    it('should find next non-marker word', () => {
      fc.assert(
        fc.property(
          fc.array(markerWordArbitrary(), { minLength: 0, maxLength: 5 }),
          lyricWordArbitrary(),
          fc.array(fc.oneof(markerWordArbitrary(), lyricWordArbitrary()), { minLength: 0, maxLength: 5 }),
          (leadingMarkers, lyric, trailing) => {
            const words = [...leadingMarkers, lyric, ...trailing]
            const result = findNextNonMarkerIndex(words, 0)
            
            if (leadingMarkers.length === 0) {
              // First word is the lyric
              expect(result).toBe(0)
            } else {
              // Should find the lyric after markers
              expect(result).toBe(leadingMarkers.length)
            }
            
            // Verify the found word is not a marker
            if (result !== -1) {
              expect(isSectionMarker(words[result].word)).toBe(false)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return -1 when no non-marker found', () => {
      fc.assert(
        fc.property(
          fc.array(markerWordArbitrary(), { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (allMarkers, startIndex) => {
            const validStartIndex = Math.min(startIndex, allMarkers.length - 1)
            const result = findNextNonMarkerIndex(allMarkers, validStartIndex)
            expect(result).toBe(-1)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return current index if already on non-marker', () => {
      fc.assert(
        fc.property(
          lyricWordArbitrary(),
          fc.array(fc.oneof(markerWordArbitrary(), lyricWordArbitrary()), { minLength: 0, maxLength: 5 }),
          (lyric, trailing) => {
            const words = [lyric, ...trailing]
            const result = findNextNonMarkerIndex(words, 0)
            expect(result).toBe(0)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle empty array', () => {
      const result = findNextNonMarkerIndex([], 0)
      expect(result).toBe(-1)
    })

    it('should handle out of bounds index', () => {
      fc.assert(
        fc.property(
          mixedAlignedWordsArbitrary(1, 10),
          (words) => {
            const result = findNextNonMarkerIndex(words, words.length)
            expect(result).toBe(-1)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('hasMarkers', () => {
    it('should return true when markers exist', () => {
      fc.assert(
        fc.property(
          fc.array(lyricWordArbitrary(), { minLength: 0, maxLength: 5 }),
          markerWordArbitrary(),
          fc.array(fc.oneof(markerWordArbitrary(), lyricWordArbitrary()), { minLength: 0, maxLength: 5 }),
          (before, marker, after) => {
            const words = [...before, marker, ...after]
            expect(hasMarkers(words)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return false when no markers exist', () => {
      fc.assert(
        fc.property(
          fc.array(lyricWordArbitrary(), { minLength: 1, maxLength: 10 }),
          (allLyrics) => {
            expect(hasMarkers(allLyrics)).toBe(false)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return false for empty array', () => {
      expect(hasMarkers([])).toBe(false)
    })
  })
})
