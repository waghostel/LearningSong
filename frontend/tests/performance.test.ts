/**
 * Performance tests for VTT generation and lyrics synchronization
 * 
 * **Feature: vtt-download-enhancement**
 * **Task 9.1: Write performance tests**
 * **Requirements: All requirements**
 */

import * as fc from 'fast-check'
import {
  aggregateWordsToLines,
  generateVttContent,
  type LineCue,
} from '@/lib/vtt-generator'
import type { AlignedWord } from '@/types/lyrics'
import {
  measurePerformance,
  binarySearchCurrentLine,
  PERFORMANCE_THRESHOLDS,
  debounce,
  throttle,
  LRUCache,
  memoize,
} from '@/lib/performance-utils'

describe('Performance Tests', () => {
  describe('Word-to-Line Aggregation Performance', () => {
    it('should aggregate small datasets (10 lines) within threshold', () => {
      const alignedWords: AlignedWord[] = Array.from({ length: 50 }, (_, i) => ({
        word: `word${i}`,
        startS: i * 0.5,
        endS: (i + 1) * 0.5,
        success: true,
        palign: 0,
      }))
      
      const lyrics = Array.from({ length: 10 }, (_, i) => 
        Array.from({ length: 5 }, (_, j) => `word${i * 5 + j}`).join(' ')
      ).join('\n')

      const { durationMs } = measurePerformance(() => 
        aggregateWordsToLines(alignedWords, lyrics)
      )

      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.AGGREGATION_MAX_MS)
    })

    it('should aggregate medium datasets (100 lines) within acceptable time', () => {
      const alignedWords: AlignedWord[] = Array.from({ length: 500 }, (_, i) => ({
        word: `word${i}`,
        startS: i * 0.1,
        endS: (i + 1) * 0.1,
        success: true,
        palign: 0,
      }))
      
      const lyrics = Array.from({ length: 100 }, (_, i) => 
        Array.from({ length: 5 }, (_, j) => `word${i * 5 + j}`).join(' ')
      ).join('\n')

      const { durationMs } = measurePerformance(() => 
        aggregateWordsToLines(alignedWords, lyrics)
      )

      // Allow 500ms for larger datasets
      expect(durationMs).toBeLessThan(500)
    })

    it('should handle large datasets (1000 aligned words) without crashing', () => {
      const alignedWords: AlignedWord[] = Array.from({ length: 1000 }, (_, i) => ({
        word: `word${i}`,
        startS: i * 0.05,
        endS: (i + 1) * 0.05,
        success: true,
        palign: 0,
      }))
      
      const lyrics = Array.from({ length: 100 }, (_, i) => 
        Array.from({ length: 10 }, (_, j) => `word${i * 10 + j}`).join(' ')
      ).join('\n')

      const { result, durationMs } = measurePerformance(() => 
        aggregateWordsToLines(alignedWords, lyrics)
      )

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      // Allow 2 seconds for very large datasets
      expect(durationMs).toBeLessThan(2000)
    })

    it('Property: aggregation time scales linearly with input size', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),
          (lineCount) => {
            const wordsPerLine = 5
            const alignedWords: AlignedWord[] = Array.from(
              { length: lineCount * wordsPerLine },
              (_, i) => ({
                word: `word${i}`,
                startS: i * 0.1,
                endS: (i + 1) * 0.1,
                success: true,
                palign: 0,
              })
            )

            const lyrics = Array.from({ length: lineCount }, (_, i) =>
              Array.from({ length: wordsPerLine }, (_, j) =>
                `word${i * wordsPerLine + j}`
              ).join(' ')
            ).join('\n')

            const { durationMs } = measurePerformance(() =>
              aggregateWordsToLines(alignedWords, lyrics)
            )

            // Allow generous time to avoid flaky tests
            // Expected: ~0.1ms per line, allow 10ms per line for safety
            return durationMs < lineCount * 10
          }
        ),
        { numRuns: 10 } // Limit runs for performance tests
      )
    })
  })

  describe('VTT Content Generation Performance', () => {
    it('should generate VTT content for small datasets within threshold', () => {
      const lineCues: LineCue[] = Array.from({ length: 20 }, (_, i) => ({
        lineIndex: i,
        text: `Line ${i} with some text content`,
        startTime: i * 3,
        endTime: (i + 1) * 3,
        isMarker: false,
      }))

      const { durationMs } = measurePerformance(() =>
        generateVttContent(lineCues)
      )

      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.VTT_GENERATION_MAX_MS)
    })

    it('should generate VTT content for large datasets within acceptable time', () => {
      const lineCues: LineCue[] = Array.from({ length: 500 }, (_, i) => ({
        lineIndex: i,
        text: `Line ${i} with some longer text content for testing purposes`,
        startTime: i * 2,
        endTime: (i + 1) * 2,
        isMarker: i % 10 === 0,
      }))

      const { result, durationMs } = measurePerformance(() =>
        generateVttContent(lineCues)
      )

      expect(result).toContain('WEBVTT')
      // Allow 200ms for large datasets
      expect(durationMs).toBeLessThan(200)
    })

    it('Property: VTT generation time is proportional to cue count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 200 }),
          (cueCount) => {
            const lineCues: LineCue[] = Array.from({ length: cueCount }, (_, i) => ({
              lineIndex: i,
              text: `Line ${i}`,
              startTime: i,
              endTime: i + 1,
              isMarker: false,
            }))

            const { durationMs } = measurePerformance(() =>
              generateVttContent(lineCues)
            )

            // Allow 1ms per cue for safety
            return durationMs < cueCount
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  describe('Binary Search Performance', () => {
    it('should find current line in large dataset efficiently', () => {
      const lineCues = Array.from({ length: 1000 }, (_, i) => ({
        startTime: i * 3,
        endTime: (i + 1) * 3,
      }))

      const { result, durationMs } = measurePerformance(() =>
        binarySearchCurrentLine(lineCues, 1500)
      )

      expect(result).toBe(500) // Time 1500 should be in line 500
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.HIGHLIGHT_UPDATE_MAX_MS)
    })

    it('should handle rapid successive searches efficiently', () => {
      const lineCues = Array.from({ length: 500 }, (_, i) => ({
        startTime: i * 2,
        endTime: (i + 1) * 2,
      }))

      const times = Array.from({ length: 100 }, (_, i) => i * 10)

      const { durationMs } = measurePerformance(() => {
        for (const time of times) {
          binarySearchCurrentLine(lineCues, time)
        }
      })

      // 100 searches should complete in under 10ms
      expect(durationMs).toBeLessThan(10)
    })

    it('Property: binary search is O(log n) complexity', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 10000 }),
          fc.float({ min: 0, max: 30000, noNaN: true }),
          (size, time) => {
            const lineCues = Array.from({ length: size }, (_, i) => ({
              startTime: i * 3,
              endTime: (i + 1) * 3,
            }))

            const { durationMs } = measurePerformance(() =>
              binarySearchCurrentLine(lineCues, time)
            )

            // O(log n) should be very fast regardless of size
            return durationMs < 5 // 5ms max even for 10000 elements
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('Debounce and Throttle Performance', () => {
    it('debounce should batch rapid calls', async () => {
      let callCount = 0
      const debouncedFn = debounce(() => callCount++, 50)

      // Simulate rapid calls
      for (let i = 0; i < 100; i++) {
        debouncedFn()
      }

      // Wait for debounce to settle
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should only have been called once
      expect(callCount).toBe(1)
    })

    it('throttle should limit call frequency', async () => {
      let callCount = 0
      const throttledFn = throttle(() => callCount++, 50)

      // Simulate rapid calls over 200ms
      const start = Date.now()
      while (Date.now() - start < 200) {
        throttledFn()
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      // Wait for trailing call
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should be limited based on throttle window
      // Be more lenient with timing due to OS scheduling variations
      expect(callCount).toBeGreaterThan(0)
      expect(callCount).toBeLessThanOrEqual(10) // Allow for timing variations
    })
  })

  describe('LRU Cache Performance', () => {
    it('should handle cache operations efficiently', () => {
      const cache = new LRUCache<string, number>(100)

      const { durationMs: writeDuration } = measurePerformance(() => {
        for (let i = 0; i < 1000; i++) {
          cache.set(`key${i}`, i)
        }
      })

      const { durationMs: readDuration } = measurePerformance(() => {
        for (let i = 0; i < 1000; i++) {
          cache.get(`key${i % 100}`) // Only 100 keys in cache
        }
      })

      // Write and read operations should be fast
      expect(writeDuration).toBeLessThan(50)
      expect(readDuration).toBeLessThan(10)
    })

    it('should evict old entries when full', () => {
      const cache = new LRUCache<number, number>(10)

      // Fill the cache
      for (let i = 0; i < 20; i++) {
        cache.set(i, i)
      }

      // Should only have 10 entries
      expect(cache.size).toBe(10)

      // Oldest entries should be evicted
      expect(cache.has(0)).toBe(false)
      expect(cache.has(10)).toBe(true)
    })
  })

  describe('Memoization Performance', () => {
    it('should improve repeated call performance', () => {
      let computeCount = 0
      const expensiveCompute = (n: number): number => {
        computeCount++
        // Simulate expensive computation
        let result = 0
        for (let i = 0; i < 10000; i++) {
          result += Math.sin(i * n)
        }
        return result
      }

      const memoizedCompute = memoize(
        expensiveCompute,
        (n) => String(n),
        10
      )

      // First call - should compute
      const { durationMs: firstDuration } = measurePerformance(() =>
        memoizedCompute(42)
      )
      expect(computeCount).toBe(1)

      // Second call - should use cache
      const { durationMs: secondDuration } = measurePerformance(() =>
        memoizedCompute(42)
      )
      expect(computeCount).toBe(1) // No additional compute

      // Cached call should be much faster
      expect(secondDuration).toBeLessThan(firstDuration)
    })
  })

  describe('Highlighting Update Performance', () => {
    it('Property: line index lookup is consistently fast', () => {
      const lineCues = Array.from({ length: 200 }, (_, i) => ({
        startTime: i * 2,
        endTime: (i + 1) * 2,
      }))

      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 400, noNaN: true }),
          (time) => {
            const { durationMs } = measurePerformance(() =>
              binarySearchCurrentLine(lineCues, time)
            )

            return durationMs < PERFORMANCE_THRESHOLDS.HIGHLIGHT_UPDATE_MAX_MS
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle time jumping without performance degradation', () => {
      const lineCues = Array.from({ length: 100 }, (_, i) => ({
        startTime: i * 3,
        endTime: (i + 1) * 3,
      }))

      // Simulate random seeking behavior
      const jumpTimes = [150, 30, 280, 5, 200, 100, 50, 290, 10, 250]

      const { durationMs } = measurePerformance(() => {
        for (const time of jumpTimes) {
          binarySearchCurrentLine(lineCues, time)
        }
      })

      // All jumps should complete quickly
      expect(durationMs).toBeLessThan(5)
    })
  })

  describe('Complex Lyrics Performance', () => {
    it('should handle lyrics with many section markers efficiently', () => {
      // Create aligned words that match actual content lines (not markers)
      // Note: aggregateWordsToLines only includes lines that have matching words
      // Markers without matching words are skipped
      const wordsPerLine = 5
      const contentLines = 40 // Non-marker lines
      const alignedWords: AlignedWord[] = Array.from(
        { length: contentLines * wordsPerLine },
        (_, i) => ({
          word: `word${i}`,
          startS: i * 0.5,
          endS: (i + 1) * 0.5,
          success: true,
          palign: 0,
        })
      )

      // Create lyrics with markers interspersed
      let wordCounter = 0
      const lyrics = Array.from({ length: 50 }, (_, i) => {
        if (i % 5 === 0) return `[Section ${i / 5}]`
        // Generate matching words for content lines
        const line = Array.from(
          { length: wordsPerLine },
          () => `word${wordCounter++}`
        ).join(' ')
        return line
      }).join('\n')

      const { result, durationMs } = measurePerformance(() =>
        aggregateWordsToLines(alignedWords, lyrics)
      )

      // Result should contain matched content lines (markers without words are skipped)
      expect(result.length).toBeGreaterThan(0)
      // All returned lines should be non-markers since markers don't have matching words
      // This tests that markers interspersed don't break the matching algorithm
      expect(result.every((cue) => !cue.isMarker)).toBe(true)
      // Allow 500ms for this complex test - it's more about correctness than speed
      expect(durationMs).toBeLessThan(500)
    })

    it('should handle Unicode lyrics efficiently', () => {
      const alignedWords: AlignedWord[] = Array.from({ length: 100 }, (_, i) => ({
        word: `字${i}`,
        startS: i * 0.5,
        endS: (i + 1) * 0.5,
        success: true,
        palign: 0,
      }))

      const lyrics = Array.from({ length: 20 }, (_, i) =>
        Array.from({ length: 5 }, (_, j) => `字${i * 5 + j}`).join(' ')
      ).join('\n')

      const { result, durationMs } = measurePerformance(() =>
        aggregateWordsToLines(alignedWords, lyrics)
      )

      expect(result.length).toBeGreaterThan(0)
      expect(durationMs).toBeLessThan(PERFORMANCE_THRESHOLDS.AGGREGATION_MAX_MS)
    })
  })
})
