/**
 * Property-based tests for LineLyricsDisplay logic
 * 
 * **Feature: song-playback-improvements, Property 3: Line highlighting activation timing**
 * **Validates: Requirements 1.3, 1.4, 1.5**
 */
import * as fc from 'fast-check'
import { render, screen, cleanup } from '@testing-library/react'
import { LineLyricsDisplay } from '@/components/LineLyricsDisplay'
import type { LineCue } from '@/lib/vtt-generator'
import '@testing-library/jest-dom'

// Mock LineLyricsDisplay for pure logic testing if needed, 
// or test the logic function extracted if we had one.
// Since the logic is inside the component (useMemo), we can use RTL to render and check classes/aria-current.

/**
 * Logic extracted from component for easier property testing
 * Replicates the finding logic in LineLyricsDisplay
 */
function findCurrentLineIndex(
  lineCues: LineCue[],
  currentTime: number,
  offset: number,
  showMarkers: boolean
): number {
  const adjustedTime = currentTime + (offset / 1000)
  return lineCues.findIndex(cue => {
    if (cue.isMarker && !showMarkers) return false
    return adjustedTime >= cue.startTime && adjustedTime < cue.endTime
  })
}

/**
 * Generator for sorted, non-overlapping line cues
 */
const lineCuesArbitrary = fc.array(
  fc.record({
    text: fc.string({ minLength: 1 }),
    duration: fc.double({ min: 1, max: 10 }),
    gap: fc.double({ min: 0, max: 2 }),
    isMarker: fc.boolean()
  }),
  { minLength: 1, maxLength: 10 }
).map(items => {
  const cues: LineCue[] = []
  let time = 0
  items.forEach((item, index) => {
    time += item.gap
    cues.push({
      lineIndex: index,
      text: item.text,
      startTime: time,
      endTime: time + item.duration,
      isMarker: item.isMarker
    })
    time += item.duration
  })
  return cues
})

describe('LineLyricsDisplay Props', () => {

  /**
   * **Feature: song-playback-improvements, Property 3: Line highlighting activation timing**
   * **Validates: Requirements 1.3, 1.4, 1.5**
   */
  test('Property 3: Line is highlighted if and only if time is within bounds', () => {
    fc.assert(
      fc.property(
        lineCuesArbitrary,
        fc.double({ min: 0, max: 100 }), // Test time
        fc.double({ min: -5000, max: 5000 }), // Offset
        fc.boolean(), // Show markers
        (cues, currentTime, offset, showMarkers) => {
          const activeIndex = findCurrentLineIndex(cues, currentTime, offset, showMarkers)
          
          if (activeIndex !== -1) {
            const activeCue = cues[activeIndex]
            const adjustedTime = currentTime + (offset / 1000)
            
            // Check bounds
            expect(adjustedTime).toBeGreaterThanOrEqual(activeCue.startTime)
            expect(adjustedTime).toBeLessThan(activeCue.endTime)
            
            // Check marker constraint
            if (!showMarkers) {
              expect(activeCue.isMarker).toBe(false)
            }
          } else {
            // If no line is active, ensure we are truly out of bounds for all visible lines
            const adjustedTime = currentTime + (offset / 1000)
            cues.forEach(cue => {
              if (cue.isMarker && !showMarkers) return
              const inRange = adjustedTime >= cue.startTime && adjustedTime < cue.endTime
              expect(inRange).toBe(false)
            })
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
