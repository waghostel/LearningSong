/**
 * Property-based tests for LyricsDisplay component
 * Using fast-check for property-based testing
 */
import * as fc from 'fast-check'
import {
  parseLyricsIntoSections,
  calculateCurrentSection,
} from '@/lib/lyrics-display-utils'

describe('LyricsDisplay Property Tests', () => {
  /**
   * **Feature: page-c-song-playback, Property 2: Lyrics Section Highlighting Progression**
   * **Validates: Requirements 2.2**
   *
   * For any song with lyrics and duration, as playback time increases,
   * the highlighted lyrics section index SHALL be monotonically non-decreasing
   * (sections are highlighted in order).
   */
  describe('Property 2: Lyrics Section Highlighting Progression', () => {
    it('should highlight sections in monotonically non-decreasing order as time progresses', () => {
      fc.assert(
        fc.property(
          // Generate lyrics with multiple sections (2-10 sections)
          fc.array(
            fc.string({ minLength: 10, maxLength: 100 }),
            { minLength: 2, maxLength: 10 }
          ),
          // Generate duration (30 seconds to 10 minutes)
          fc.float({ min: 30, max: 600, noNaN: true }),
          // Generate sorted array of time points
          fc.array(fc.float({ min: 0, max: 1, noNaN: true }), { minLength: 5, maxLength: 20 }),
          (sectionTexts, duration, timeRatios) => {
            const lyrics = sectionTexts.join('\n\n')
            const sections = parseLyricsIntoSections(lyrics)
            
            // Skip if parsing didn't produce expected sections
            fc.pre(sections.length >= 2)

            // Sort time ratios to simulate time progression
            const sortedRatios = [...timeRatios].sort((a, b) => a - b)
            const times = sortedRatios.map((ratio) => ratio * duration)

            // Calculate section indices for each time point
            const sectionIndices = times.map((time) =>
              calculateCurrentSection(time, duration, sections.length)
            )

            // Verify monotonically non-decreasing
            for (let i = 1; i < sectionIndices.length; i++) {
              expect(sectionIndices[i]).toBeGreaterThanOrEqual(sectionIndices[i - 1])
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return valid section index within bounds', () => {
      fc.assert(
        fc.property(
          // Generate number of sections
          fc.integer({ min: 1, max: 20 }),
          // Generate duration
          fc.float({ min: 1, max: 600, noNaN: true }),
          // Generate current time
          fc.float({ min: 0, max: 600, noNaN: true }),
          (totalSections, duration, currentTime) => {
            const sectionIndex = calculateCurrentSection(currentTime, duration, totalSections)

            // Section index should always be within valid bounds
            expect(sectionIndex).toBeGreaterThanOrEqual(0)
            expect(sectionIndex).toBeLessThan(totalSections)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should start at section 0 when time is 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          fc.float({ min: 1, max: 600, noNaN: true }),
          (totalSections, duration) => {
            const sectionIndex = calculateCurrentSection(0, duration, totalSections)
            expect(sectionIndex).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should end at last section when time equals duration', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          fc.float({ min: 1, max: 600, noNaN: true }),
          (totalSections, duration) => {
            const sectionIndex = calculateCurrentSection(duration, duration, totalSections)
            expect(sectionIndex).toBe(totalSections - 1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge cases gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant({ time: -10, duration: 100, sections: 5 }),
            fc.constant({ time: 0, duration: 0, sections: 5 }),
            fc.constant({ time: 50, duration: 100, sections: 0 }),
            fc.constant({ time: 150, duration: 100, sections: 5 }) // time > duration
          ),
          ({ time, duration, sections }) => {
            const sectionIndex = calculateCurrentSection(time, duration, sections)
            
            // Should always return a non-negative integer
            expect(sectionIndex).toBeGreaterThanOrEqual(0)
            expect(Number.isInteger(sectionIndex)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('parseLyricsIntoSections', () => {
    it('should always return non-empty array for non-empty lyrics', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }),
          (lyrics) => {
            fc.pre(lyrics.trim().length > 0)
            
            const sections = parseLyricsIntoSections(lyrics)
            expect(sections.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array for empty or whitespace-only lyrics', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\n\n'),
            fc.constant('\t\t')
          ),
          (lyrics) => {
            const sections = parseLyricsIntoSections(lyrics)
            expect(sections.length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should split on double newlines', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 5, maxLength: 50 }).filter((s) => s.trim().length > 0),
            { minLength: 2, maxLength: 5 }
          ),
          (parts) => {
            const lyrics = parts.join('\n\n')
            const sections = parseLyricsIntoSections(lyrics)
            
            // Should have at least as many sections as parts (may be fewer if parts get merged)
            expect(sections.length).toBeGreaterThanOrEqual(1)
            expect(sections.length).toBeLessThanOrEqual(parts.length)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
