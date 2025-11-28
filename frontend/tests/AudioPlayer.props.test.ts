/**
 * Property-based tests for AudioPlayer component
 * Using fast-check for property-based testing
 */
import * as fc from 'fast-check'
import { formatTime, generateDownloadFilename } from '@/components/AudioPlayer'

describe('AudioPlayer Property Tests', () => {
  /**
   * **Feature: page-c-song-playback, Property 1: Time Display Format Consistency**
   * **Validates: Requirements 1.5**
   *
   * For any audio duration and current time values, the displayed time format
   * SHALL always be in MM:SS format with proper zero-padding.
   */
  describe('Property 1: Time Display Format Consistency', () => {
    it('should always return MM:SS format with zero-padding for typical song durations', () => {
      fc.assert(
        fc.property(
          // Generate non-negative numbers representing seconds (0 to 99 minutes - typical song range)
          // Songs are typically under 10 minutes, max reasonable is under 100 minutes
          fc.float({ min: 0, max: 5999, noNaN: true }),
          (seconds) => {
            const result = formatTime(seconds)

            // Must match MM:SS format exactly (2 digits for minutes, 2 for seconds)
            const formatRegex = /^\d{2}:\d{2}$/
            expect(result).toMatch(formatRegex)

            // Minutes part should be zero-padded
            const [mins, secs] = result.split(':')
            expect(mins.length).toBe(2)
            expect(secs.length).toBe(2)

            // Seconds part should be 00-59
            const secsNum = parseInt(secs, 10)
            expect(secsNum).toBeGreaterThanOrEqual(0)
            expect(secsNum).toBeLessThanOrEqual(59)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge cases gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(NaN),
            fc.constant(Infinity),
            fc.constant(-Infinity),
            fc.integer({ min: -1000, max: -1 }) // Negative integers
          ),
          (invalidSeconds) => {
            const result = formatTime(invalidSeconds)

            // Should return default format for invalid inputs
            expect(result).toBe('00:00')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly calculate minutes and seconds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 59 }), // minutes
          fc.integer({ min: 0, max: 59 }), // seconds
          (mins, secs) => {
            const totalSeconds = mins * 60 + secs
            const result = formatTime(totalSeconds)

            const [resultMins, resultSecs] = result.split(':').map(Number)
            expect(resultMins).toBe(mins)
            expect(resultSecs).toBe(secs)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: page-c-song-playback, Property 3: Download Filename Contains Style**
   * **Validates: Requirements 3.2**
   *
   * For any song with a valid style, the generated download filename
   * SHALL contain the style name as a substring.
   */
  describe('Property 3: Download Filename Contains Style', () => {
    const validStyles = ['pop', 'rap', 'folk', 'electronic', 'rock', 'jazz', 'children', 'classical']

    it('should include style in filename when style is provided', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validStyles),
          (style) => {
            const filename = generateDownloadFilename(style)

            // Filename should contain the style (lowercase)
            expect(filename.toLowerCase()).toContain(style.toLowerCase())

            // Should have .mp3 extension
            expect(filename).toMatch(/\.mp3$/)

            // Should start with learning-song
            expect(filename).toMatch(/^learning-song/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate valid filename without style', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(undefined), fc.constant('')),
          (style) => {
            const filename = generateDownloadFilename(style || undefined)

            // Should have .mp3 extension
            expect(filename).toMatch(/\.mp3$/)

            // Should start with learning-song
            expect(filename).toMatch(/^learning-song/)

            // Should contain date pattern
            expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle arbitrary style strings', () => {
      fc.assert(
        fc.property(
          // Generate non-empty alphanumeric strings as styles
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]*$/),
          (style) => {
            fc.pre(style.length > 0) // Precondition: non-empty style

            const filename = generateDownloadFilename(style)

            // Filename should contain the style (lowercase)
            expect(filename.toLowerCase()).toContain(style.toLowerCase())

            // Should have .mp3 extension
            expect(filename).toMatch(/\.mp3$/)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
