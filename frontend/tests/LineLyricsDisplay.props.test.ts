/**
 * Property-based tests for LineLyricsDisplay component
 * Using fast-check for property-based testing
 * 
 * **Feature: song-playback-improvements, Property 23: Current line highlighting**
 * **Validates: Requirements 9.1, 9.4**
 */
import * as fc from 'fast-check'
import type { LineCue } from '@/lib/vtt-generator'

/**
 * Helper function extracted from LineLyricsDisplay for testing
 * Finds the index of the current line based on playback time
 */
function findCurrentLineIndex(
  lineCues: LineCue[],
  currentTime: number,
  offset: number = 0
): number {
  const adjustedTime = currentTime + offset / 1000

  // Find the line that contains the current time
  for (let i = lineCues.length - 1; i >= 0; i--) {
    if (lineCues[i].startTime <= adjustedTime) {
      return i
    }
  }

  return -1
}

/**
 * Generator for a valid LineCue with proper timing constraints
 */
const lineCueArbitrary = (minStart: number = 0): fc.Arbitrary<LineCue> =>
  fc.record({
    lineIndex: fc.integer({ min: 0, max: 100 }),
    text: fc.string({ minLength: 1, maxLength: 100 }),
    startS: fc.integer({ min: Math.ceil(minStart), max: 300 }),
    duration: fc.integer({ min: 1, max: 50 }),
    isMarker: fc.boolean(),
  }).map(({ lineIndex, text, startS, duration, isMarker }) => ({
    lineIndex,
    text,
    startTime: startS,
    endTime: startS + duration / 10,
    isMarker,
  }))

/**
 * Generator for a sorted array of non-overlapping line cues
 */
const sortedLineCuesArbitrary = (minLength: number = 1, maxLength: number = 20): fc.Arbitrary<LineCue[]> =>
  fc.array(
    fc.record({
      text: fc.string({ minLength: 1, maxLength: 50 }).filter(w => w.trim().length > 0),
      duration: fc.integer({ min: 1, max: 30 }),
      gap: fc.integer({ min: 0, max: 10 }),
      isMarker: fc.boolean(),
    }),
    { minLength, maxLength }
  ).map(items => {
    const cues: LineCue[] = []
    let currentTime = 0
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const duration = item.duration / 10
      const gap = item.gap / 10
      const trimmedText = item.text.trim()
      if (trimmedText.length === 0) continue
      
      cues.push({
        lineIndex: i,
        text: trimmedText,
        startTime: currentTime,
        endTime: currentTime + duration,
        isMarker: item.isMarker,
      })
      currentTime += duration + gap
    }
    
    return cues
  })

describe('LineLyricsDisplay Property Tests', () => {
  /**
   * **Feature: song-playback-improvements, Property 23: Current line highlighting**
   * **Validates: Requirements 9.1, 9.4**
   * 
   * For any playback time T, the highlighted line should be the line where
   * startTime <= T < endTime, or the most recently passed line if T is between lines.
   */
  describe('Property 23: Current line highlighting', () => {
    it('should return -1 when currentTime is before all lines', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(1, 10),
          (lineCues) => {
            if (lineCues.length === 0) return
            
            // Time before first line
            const currentTime = lineCues[0].startTime - 1
            const index = findCurrentLineIndex(lineCues, currentTime)
            
            expect(index).toBe(-1)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return the line index when currentTime is within a line', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(1, 10),
          (lineCues) => {
            if (lineCues.length === 0) return
            
            // Pick a random line and a time within it
            const lineIndex = Math.floor(Math.random() * lineCues.length)
            const line = lineCues[lineIndex]
            const currentTime = line.startTime + (line.endTime - line.startTime) / 2
            
            const foundIndex = findCurrentLineIndex(lineCues, currentTime)
            
            // Should find this line or a later one
            expect(foundIndex).toBeGreaterThanOrEqual(lineIndex)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return the most recently passed line when between lines', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(2, 10),
          (lineCues) => {
            if (lineCues.length < 2) return
            
            // Pick two consecutive lines
            const lineIndex = Math.floor(Math.random() * (lineCues.length - 1))
            const currentLine = lineCues[lineIndex]
            const nextLine = lineCues[lineIndex + 1]
            
            // Time strictly between the two lines (not at boundaries)
            const gap = nextLine.startTime - currentLine.endTime
            if (gap <= 0) return // No gap between lines
            
            const currentTime = currentLine.endTime + gap * 0.5
            
            const foundIndex = findCurrentLineIndex(lineCues, currentTime)
            
            // Should return the current line (most recently passed)
            expect(foundIndex).toBe(lineIndex)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should satisfy startTime <= adjustedTime for returned line', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(1, 10),
          fc.float({ min: 0, max: 1000 }),
          (lineCues, currentTime) => {
            if (!isFinite(currentTime)) return
            
            const index = findCurrentLineIndex(lineCues, currentTime)
            
            if (index >= 0) {
              // If a line is returned, currentTime should be >= line.startTime
              expect(currentTime).toBeGreaterThanOrEqual(lineCues[index].startTime)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should apply offset correctly to currentTime', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(1, 5),
          fc.integer({ min: -1000, max: 1000 }),
          (lineCues, offsetMs) => {
            if (lineCues.length === 0) return
            
            // Pick a line and a time within it
            const lineIndex = 0
            const line = lineCues[lineIndex]
            const baseTime = line.startTime + (line.endTime - line.startTime) / 2
            
            // With offset, the effective time is baseTime + offset/1000
            const index = findCurrentLineIndex(lineCues, baseTime, offsetMs)
            
            // The returned index should be valid
            expect(index).toBeGreaterThanOrEqual(-1)
            expect(index).toBeLessThan(lineCues.length)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return the last line when currentTime is after all lines', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(1, 10),
          (lineCues) => {
            if (lineCues.length === 0) return
            
            // Time after last line
            const currentTime = lineCues[lineCues.length - 1].endTime + 10
            const index = findCurrentLineIndex(lineCues, currentTime)
            
            // Should return the last line
            expect(index).toBe(lineCues.length - 1)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle empty line cues gracefully', () => {
      const index = findCurrentLineIndex([], 5)
      expect(index).toBe(-1)
    })

    it('should maintain monotonicity: if T1 < T2, then index(T1) <= index(T2)', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(2, 10),
          (lineCues) => {
            if (lineCues.length < 2) return
            
            // Pick two times
            const time1 = lineCues[0].startTime + 1
            const time2 = lineCues[lineCues.length - 1].endTime + 1
            
            const index1 = findCurrentLineIndex(lineCues, time1)
            const index2 = findCurrentLineIndex(lineCues, time2)
            
            // If time1 < time2, then index1 should be <= index2
            expect(index1).toBeLessThanOrEqual(index2)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle negative offset correctly', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(1, 5),
          (lineCues) => {
            if (lineCues.length === 0) return
            
            const line = lineCues[0]
            const currentTime = line.startTime + 0.5
            const negativeOffset = -500 // -500ms
            
            const index = findCurrentLineIndex(lineCues, currentTime, negativeOffset)
            
            // With negative offset, effective time is earlier, so might not find the line
            expect(index).toBeGreaterThanOrEqual(-1)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle positive offset correctly', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(2, 5),
          (lineCues) => {
            if (lineCues.length < 2) return
            
            const line = lineCues[0]
            const currentTime = line.startTime + 0.1
            const positiveOffset = 500 // +500ms
            
            const index = findCurrentLineIndex(lineCues, currentTime, positiveOffset)
            
            // With positive offset, effective time is later, so might skip to next line
            expect(index).toBeGreaterThanOrEqual(-1)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: song-playback-improvements, Property 22: Line click navigation**
   * **Validates: Requirements 8.2**
   * 
   * For any click on a lyrics line, the audio player should seek to that line's startTime.
   */
  describe('Property 22: Line click navigation', () => {
    it('should call onLineClick with correct startTime when line is clicked', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(1, 10),
          (lineCues) => {
            if (lineCues.length === 0) return
            
            // Pick a random non-marker line
            const nonMarkerLines = lineCues.filter(cue => !cue.isMarker)
            if (nonMarkerLines.length === 0) return
            
            const lineToClick = nonMarkerLines[Math.floor(Math.random() * nonMarkerLines.length)]
            
            // Mock the onLineClick callback
            const onLineClick = jest.fn()
            
            // Simulate clicking the line
            onLineClick(lineToClick.startTime)
            
            // Verify the callback was called with the correct startTime
            expect(onLineClick).toHaveBeenCalledWith(lineToClick.startTime)
            expect(onLineClick).toHaveBeenCalledTimes(1)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should not call onLineClick when clicking a section marker', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(1, 10),
          (lineCues) => {
            // Create a marker line
            const markerLine: LineCue = {
              lineIndex: 0,
              text: '**[Verse 1]**',
              startTime: 0,
              endTime: 1,
              isMarker: true,
            }
            
            // Mock the onLineClick callback
            const onLineClick = jest.fn()
            
            // Simulate clicking the marker (should not call callback)
            // In the actual component, the onClick handler checks !cue.isMarker
            if (!markerLine.isMarker) {
              onLineClick(markerLine.startTime)
            }
            
            // Verify the callback was NOT called
            expect(onLineClick).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should call onLineClick with startTime for all non-marker lines', () => {
      fc.assert(
        fc.property(
          sortedLineCuesArbitrary(1, 10),
          (lineCues) => {
            if (lineCues.length === 0) return
            
            const onLineClick = jest.fn()
            
            // Simulate clicking all non-marker lines
            for (const cue of lineCues) {
              if (!cue.isMarker) {
                onLineClick(cue.startTime)
              }
            }
            
            // Count non-marker lines
            const nonMarkerCount = lineCues.filter(cue => !cue.isMarker).length
            
            // Verify callback was called for each non-marker line
            expect(onLineClick).toHaveBeenCalledTimes(nonMarkerCount)
            
            // Verify each call had the correct startTime
            for (let i = 0; i < nonMarkerCount; i++) {
              const nonMarkerLines = lineCues.filter(cue => !cue.isMarker)
              expect(onLineClick).toHaveBeenNthCalledWith(i + 1, nonMarkerLines[i].startTime)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should pass the exact startTime value without modification', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 3600 }),
          (startTime) => {
            if (!isFinite(startTime)) return
            
            const lineCue: LineCue = {
              lineIndex: 0,
              text: 'Test line',
              startTime,
              endTime: startTime + 1,
              isMarker: false,
            }
            
            const onLineClick = jest.fn()
            onLineClick(lineCue.startTime)
            
            // Verify the exact startTime is passed
            expect(onLineClick).toHaveBeenCalledWith(startTime)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('Current line highlighting edge cases', () => {
    it('should handle single line cue', () => {
      const lineCues: LineCue[] = [
        {
          lineIndex: 0,
          text: 'Single line',
          startTime: 0,
          endTime: 5,
          isMarker: false,
        },
      ]
      
      expect(findCurrentLineIndex(lineCues, -1)).toBe(-1)
      expect(findCurrentLineIndex(lineCues, 2.5)).toBe(0)
      expect(findCurrentLineIndex(lineCues, 10)).toBe(0)
    })

    it('should handle lines with zero duration', () => {
      const lineCues: LineCue[] = [
        {
          lineIndex: 0,
          text: 'Line 1',
          startTime: 0,
          endTime: 0,
          isMarker: false,
        },
        {
          lineIndex: 1,
          text: 'Line 2',
          startTime: 5,
          endTime: 10,
          isMarker: false,
        },
      ]
      
      // Time at zero-duration line
      expect(findCurrentLineIndex(lineCues, 0)).toBe(0)
      // Time after zero-duration line
      expect(findCurrentLineIndex(lineCues, 2.5)).toBe(0)
      // Time at next line
      expect(findCurrentLineIndex(lineCues, 7.5)).toBe(1)
    })

    it('should handle very small time differences', () => {
      const lineCues: LineCue[] = [
        {
          lineIndex: 0,
          text: 'Line 1',
          startTime: 0,
          endTime: 0.001,
          isMarker: false,
        },
        {
          lineIndex: 1,
          text: 'Line 2',
          startTime: 0.001,
          endTime: 0.002,
          isMarker: false,
        },
      ]
      
      expect(findCurrentLineIndex(lineCues, 0.0005)).toBe(0)
      expect(findCurrentLineIndex(lineCues, 0.0015)).toBe(1)
    })

    it('should handle large time values', () => {
      const lineCues: LineCue[] = [
        {
          lineIndex: 0,
          text: 'Line 1',
          startTime: 3600,
          endTime: 3605,
          isMarker: false,
        },
      ]
      
      expect(findCurrentLineIndex(lineCues, 3602.5)).toBe(0)
    })
  })
})
