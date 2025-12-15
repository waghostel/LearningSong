/**
 * Property-based tests for section marker highlighting skip in useLyricsSync
 * Using fast-check for property-based testing
 * 
 * **Feature: song-playback-improvements, Property 19: Section marker highlighting skip**
 * **Validates: Requirements 13.4, 13.5**
 */
import * as fc from 'fast-check'
import { renderHook } from '@testing-library/react'
import { useLyricsSync } from '@/hooks/useLyricsSync'
import type { AlignedWord } from '@/types/lyrics'
import { isSectionMarker } from '@/lib/section-marker-utils'

/**
 * Generator for section marker strings
 */
const sectionMarkerArbitrary = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant('**[Verse 1]**'),
    fc.constant('**[Chorus]**'),
    fc.constant('**[Bridge]**'),
    fc.constant('**Verse**'),
    fc.constant('**Chorus**')
  )

/**
 * Generator for non-marker strings (regular lyrics)
 */
const nonMarkerArbitrary = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.startsWith('**') || !s.endsWith('**')),
    fc.constant('Hello'),
    fc.constant('world'),
    fc.constant('singing')
  )

/**
 * Generator for AlignedWord with section marker
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _markerWordArbitrary = (startTime: number): fc.Arbitrary<AlignedWord> =>
  fc.record({
    word: sectionMarkerArbitrary(),
    duration: fc.float({ min: Math.fround(0.1), max: 2 }),
    success: fc.boolean(),
    palign: fc.float({ min: 0, max: 1 }),
  }).map(({ word, duration, success, palign }) => ({
    word,
    startS: startTime,
    endS: startTime + duration,
    success,
    palign,
  }))

/**
 * Generator for AlignedWord with regular lyric
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _lyricWordArbitrary = (startTime: number): fc.Arbitrary<AlignedWord> =>
  fc.record({
    word: nonMarkerArbitrary(),
    duration: fc.float({ min: Math.fround(0.1), max: 2 }),
    success: fc.boolean(),
    palign: fc.float({ min: 0, max: 1 }),
  }).map(({ word, duration, success, palign }) => ({
    word,
    startS: startTime,
    endS: startTime + duration,
    success,
    palign,
  }))

/**
 * Generator for a sequence of aligned words with markers followed by lyrics
 */
const markerFollowedByLyricsArbitrary = (): fc.Arbitrary<AlignedWord[]> =>
  fc.record({
    numMarkers: fc.integer({ min: 1, max: 3 }),
    numLyrics: fc.integer({ min: 1, max: 5 }),
    markerDurations: fc.array(
      fc.float({ min: Math.fround(0.1), max: 2, noNaN: true }),
      { minLength: 3, maxLength: 3 }
    ),
    lyricDurations: fc.array(
      fc.float({ min: Math.fround(0.1), max: 2, noNaN: true }),
      { minLength: 5, maxLength: 5 }
    ),
  }).map(({ numMarkers, numLyrics, markerDurations, lyricDurations }) => {
    const words: AlignedWord[] = []
    let currentTime = 0

    // Generate markers
    for (let i = 0; i < numMarkers; i++) {
      const duration = markerDurations[i]
      words.push({
        word: i === 0 ? '**[Verse 1]**' : i === 1 ? '**[Chorus]**' : '**[Bridge]**',
        startS: currentTime,
        endS: currentTime + duration,
        success: true,
        palign: 0,
      })
      currentTime += duration + 0.1
    }

    // Generate lyrics
    for (let i = 0; i < numLyrics; i++) {
      const duration = lyricDurations[i]
      const lyricWords = ['Hello', 'world', 'singing', 'music', 'love']
      words.push({
        word: lyricWords[i % lyricWords.length],
        startS: currentTime,
        endS: currentTime + duration,
        success: true,
        palign: 0,
      })
      currentTime += duration + 0.1
    }

    return words
  })

describe('useLyricsSync Marker Skip Property Tests', () => {
  /**
   * **Feature: song-playback-improvements, Property 19: Section marker highlighting skip**
   * **Validates: Requirements 13.4, 13.5**
   * 
   * For any playback time that falls within a section marker's timestamp range,
   * the current word highlight should be applied to the next non-marker word instead of the marker.
   */
  describe('Property 19: Section marker highlighting skip', () => {
    it('should skip markers and highlight next lyric when skipMarkers is true', () => {
      fc.assert(
        fc.property(
          markerFollowedByLyricsArbitrary(),
          (words) => {
            // Find the first marker
            const firstMarkerIndex = words.findIndex(w => isSectionMarker(w.word))
            if (firstMarkerIndex === -1) return // No markers, skip test
            
            const marker = words[firstMarkerIndex]
            
            // Set current time to be within the marker's range
            const timeInMarker = (marker.startS + marker.endS) / 2
            
            const { result } = renderHook(() =>
              useLyricsSync({
                alignedWords: words,
                currentTime: timeInMarker,
                skipMarkers: true,
              })
            )
            
            // The current word should NOT be the marker
            if (result.current.currentWord) {
              expect(isSectionMarker(result.current.currentWord.word)).toBe(false)
            }
            
            // The current word index should be after the marker
            if (result.current.currentWordIndex !== -1) {
              expect(result.current.currentWordIndex).toBeGreaterThan(firstMarkerIndex)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should not skip markers when skipMarkers is false', () => {
      fc.assert(
        fc.property(
          markerFollowedByLyricsArbitrary(),
          (words) => {
            // Find the first marker
            const firstMarkerIndex = words.findIndex(w => isSectionMarker(w.word))
            if (firstMarkerIndex === -1) return // No markers, skip test
            
            const marker = words[firstMarkerIndex]
            
            // Set current time to be within the marker's range
            const timeInMarker = (marker.startS + marker.endS) / 2
            
            const { result } = renderHook(() =>
              useLyricsSync({
                alignedWords: words,
                currentTime: timeInMarker,
                skipMarkers: false,
              })
            )
            
            // The current word SHOULD be the marker
            expect(result.current.currentWordIndex).toBe(firstMarkerIndex)
            if (result.current.currentWord) {
              expect(isSectionMarker(result.current.currentWord.word)).toBe(true)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle consecutive markers by finding next non-marker', () => {
      // Create a sequence: marker1, marker2, marker3, lyric1, lyric2
      const words: AlignedWord[] = [
        { word: '**[Verse 1]**', startS: 0, endS: 1, success: true, palign: 0 },
        { word: '**[Intro]**', startS: 1.1, endS: 2, success: true, palign: 0 },
        { word: '**[Part A]**', startS: 2.1, endS: 3, success: true, palign: 0 },
        { word: 'Hello', startS: 3.1, endS: 4, success: true, palign: 0 },
        { word: 'world', startS: 4.1, endS: 5, success: true, palign: 0 },
      ]
      
      // Time within first marker
      const { result } = renderHook(() =>
        useLyricsSync({
          alignedWords: words,
          currentTime: 0.5,
          skipMarkers: true,
        })
      )
      
      // Should skip all markers and highlight first lyric
      expect(result.current.currentWordIndex).toBe(3)
      expect(result.current.currentWord?.word).toBe('Hello')
    })

    it('should return -1 when only markers exist and skipMarkers is true', () => {
      const words: AlignedWord[] = [
        { word: '**[Verse 1]**', startS: 0, endS: 1, success: true, palign: 0 },
        { word: '**[Chorus]**', startS: 1.1, endS: 2, success: true, palign: 0 },
      ]
      
      const { result } = renderHook(() =>
        useLyricsSync({
          alignedWords: words,
          currentTime: 0.5,
          skipMarkers: true,
        })
      )
      
      // Should return -1 since no non-marker words exist
      expect(result.current.currentWordIndex).toBe(-1)
      expect(result.current.currentWord).toBeNull()
    })

    it('should work normally with lyrics when no markers present', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              word: nonMarkerArbitrary(),
              startS: fc.float({ min: 0, max: 100 }),
            }).chain(({ word, startS }) =>
              fc.float({ min: Math.fround(0.1), max: 2 }).map(duration => ({
                word,
                startS,
                endS: startS + duration,
                success: true,
                palign: 0,
              }))
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (words) => {
            if (words.length === 0) return
            
            const firstWord = words[0]
            const timeInWord = (firstWord.startS + firstWord.endS) / 2
            
            const { result: withSkip } = renderHook(() =>
              useLyricsSync({
                alignedWords: words,
                currentTime: timeInWord,
                skipMarkers: true,
              })
            )
            
            const { result: withoutSkip } = renderHook(() =>
              useLyricsSync({
                alignedWords: words,
                currentTime: timeInWord,
                skipMarkers: false,
              })
            )
            
            // Both should return the same result when no markers present
            expect(withSkip.current.currentWordIndex).toBe(withoutSkip.current.currentWordIndex)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
