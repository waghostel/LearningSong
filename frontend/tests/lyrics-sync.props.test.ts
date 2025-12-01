/**
 * Property-based tests for lyrics synchronization utilities
 * Using fast-check for property-based testing
 * 
 * **Feature: timestamped-lyrics-sync, Property 4: Binary search correctness**
 * **Validates: Requirements 4.1, 4.2**
 * 
 * **Feature: timestamped-lyrics-sync, Property 2: Correct word highlighting by time**
 * **Validates: Requirements 1.2**
 * 
 * **Feature: timestamped-lyrics-sync, Property 5: Word state classification**
 * **Validates: Requirements 5.1, 5.2**
 */
import * as fc from 'fast-check'
import { findWordAtTime, classifyWordState, calculateWordProgress } from '@/lib/lyrics-sync'
import type { AlignedWord } from '@/types/lyrics'

/**
 * Generator for a valid AlignedWord with proper timing constraints
 * Uses integers for timing to avoid 32-bit float issues with fast-check v4
 */
const alignedWordArbitrary = (minStart: number = 0): fc.Arbitrary<AlignedWord> =>
  fc.record({
    word: fc.string({ minLength: 1, maxLength: 50 }),
    startS: fc.integer({ min: Math.ceil(minStart), max: 300 }),
    success: fc.boolean(),
    palign: fc.integer({ min: 0, max: 100 }).map(n => n / 100),
  }).chain(({ word, startS, success, palign }) =>
    fc.integer({ min: 1, max: 100 }).map(duration => ({
      word,
      startS,
      endS: startS + duration / 10, // duration in 0.1 to 10 seconds
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
      duration: fc.integer({ min: 1, max: 30 }), // 0.1 to 3 seconds
      gap: fc.integer({ min: 0, max: 10 }), // 0 to 1 second
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

describe('Lyrics Sync Property Tests', () => {
  /**
   * **Feature: timestamped-lyrics-sync, Property 4: Binary search correctness**
   * **Validates: Requirements 4.1, 4.2**
   *
   * For any sorted array of aligned words (sorted by startS) and any time value,
   * binary search should return the word whose time range contains that value,
   * or the nearest word if no exact match exists, in O(log n) comparisons.
   */
  describe('Property 4: Binary search correctness', () => {
    it('should return the correct word when time falls within a word range', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 10),
          fc.integer({ min: 0, max: 100 }),
          (words, wordIndexSeed) => {
            // Pick a random word from the array
            const wordIndex = wordIndexSeed % words.length
            const targetWord = words[wordIndex]
            
            // Pick a time within that word's range
            const midTime = (targetWord.startS + targetWord.endS) / 2
            
            const result = findWordAtTime(words, midTime)
            
            // Should find the correct word
            expect(result.word).not.toBeNull()
            expect(result.state).toBe('current')
            expect(midTime).toBeGreaterThanOrEqual(result.word!.startS)
            expect(midTime).toBeLessThanOrEqual(result.word!.endS)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return empty result for empty array', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 300 }),
          (time) => {
            const result = findWordAtTime([], time)
            
            expect(result.index).toBe(-1)
            expect(result.word).toBeNull()
            expect(result.state).toBe('upcoming')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return first word as upcoming when time is before first word', () => {
      // Generate words that start after time 0
      const wordsWithGap = sortedAlignedWordsArbitrary(1, 10).map(words => {
        // Shift all words forward by 1 second
        return words.map(w => ({
          ...w,
          startS: w.startS + 1,
          endS: w.endS + 1,
        }))
      })
      
      fc.assert(
        fc.property(
          wordsWithGap,
          (words) => {
            const firstWord = words[0]
            const timeBefore = 0.5 // Always before the shifted words
            
            const result = findWordAtTime(words, timeBefore)
            
            expect(result.index).toBe(0)
            expect(result.word).toEqual(firstWord)
            expect(result.state).toBe('upcoming')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return last word as completed when time is after last word', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 10),
          fc.integer({ min: 1, max: 100 }),
          (words, extraTime) => {
            const lastWord = words[words.length - 1]
            const timeAfter = lastWord.endS + extraTime
            
            const result = findWordAtTime(words, timeAfter)
            
            expect(result.index).toBe(words.length - 1)
            expect(result.word).toEqual(lastWord)
            expect(result.state).toBe('completed')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should find nearest word when time falls in a gap between words', () => {
      // Generate words with guaranteed gaps
      const wordsWithGaps = fc.array(
        fc.record({
          word: fc.string({ minLength: 1, maxLength: 5 }),
          duration: fc.integer({ min: 5, max: 15 }), // 0.5 to 1.5 seconds
          gap: fc.integer({ min: 5, max: 15 }), // 0.5 to 1.5 seconds (guaranteed gap)
        }),
        { minLength: 2, maxLength: 5 }
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
            success: true,
            palign: 0,
          })
          currentTime += duration + gap
        }
        
        return words
      })
      
      fc.assert(
        fc.property(
          wordsWithGaps,
          fc.integer({ min: 0, max: 100 }),
          (words, gapIndexSeed) => {
            // Pick a gap between words
            const gapIndex = gapIndexSeed % (words.length - 1)
            const prevWord = words[gapIndex]
            const nextWord = words[gapIndex + 1]
            
            // Time in the middle of the gap
            const gapTime = (prevWord.endS + nextWord.startS) / 2
            
            const result = findWordAtTime(words, gapTime)
            
            // Should return a valid word (either the previous or next)
            expect(result.word).not.toBeNull()
            expect([gapIndex, gapIndex + 1]).toContain(result.index)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should correctly handle single word array', () => {
      fc.assert(
        fc.property(
          alignedWordArbitrary(0),
          fc.integer({ min: 0, max: 50 }),
          (word, time) => {
            const result = findWordAtTime([word], time)
            
            // Should always return the single word
            expect(result.word).toEqual(word)
            expect(result.index).toBe(0)
            
            // State should be correct
            if (time >= word.startS && time <= word.endS) {
              expect(result.state).toBe('current')
            } else if (time > word.endS) {
              expect(result.state).toBe('completed')
            } else {
              expect(result.state).toBe('upcoming')
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: timestamped-lyrics-sync, Property 2: Correct word highlighting by time**
   * **Validates: Requirements 1.2**
   *
   * For any aligned words array and any playback time within the song duration,
   * the highlighted word should be the one whose time range (startS to endS)
   * contains the current playback time.
   */
  describe('Property 2: Correct word highlighting by time', () => {
    it('should highlight the word whose time range contains the current playback time', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 15),
          fc.integer({ min: 0, max: 100 }),
          (words, wordIndexSeed) => {
            // Pick a random word from the array
            const wordIndex = wordIndexSeed % words.length
            const targetWord = words[wordIndex]
            
            // Pick a time within that word's range (not at boundaries to avoid edge cases)
            const timeWithinWord = targetWord.startS + (targetWord.endS - targetWord.startS) * 0.5
            
            const result = findWordAtTime(words, timeWithinWord)
            
            // The highlighted word should contain the current time
            expect(result.word).not.toBeNull()
            expect(result.state).toBe('current')
            expect(timeWithinWord).toBeGreaterThanOrEqual(result.word!.startS)
            expect(timeWithinWord).toBeLessThanOrEqual(result.word!.endS)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return current state only when time is within word boundaries', () => {
      fc.assert(
        fc.property(
          sortedAlignedWordsArbitrary(1, 10),
          (words) => {
            // For each word, verify that times within its range return 'current' state
            for (const word of words) {
              const midTime = (word.startS + word.endS) / 2
              const result = findWordAtTime(words, midTime)
              
              // If we're within a word's range, state should be 'current'
              if (result.word && midTime >= result.word.startS && midTime <= result.word.endS) {
                expect(result.state).toBe('current')
              }
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should not highlight any word as current when time is in a gap', () => {
      // Generate words with guaranteed gaps
      const wordsWithGaps = fc.array(
        fc.record({
          word: fc.string({ minLength: 1, maxLength: 5 }),
          duration: fc.integer({ min: 10, max: 20 }), // 1 to 2 seconds
          gap: fc.integer({ min: 10, max: 20 }), // 1 to 2 seconds (guaranteed gap)
        }),
        { minLength: 2, maxLength: 5 }
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
            success: true,
            palign: 0,
          })
          currentTime += duration + gap
        }
        
        return words
      })
      
      fc.assert(
        fc.property(
          wordsWithGaps,
          fc.integer({ min: 0, max: 100 }),
          (words, gapIndexSeed) => {
            // Pick a gap between words
            const gapIndex = gapIndexSeed % (words.length - 1)
            const prevWord = words[gapIndex]
            const nextWord = words[gapIndex + 1]
            
            // Time in the middle of the gap
            const gapTime = (prevWord.endS + nextWord.startS) / 2
            
            const result = findWordAtTime(words, gapTime)
            
            // When time is in a gap, the state should NOT be 'current'
            // (it should be 'completed' for the previous word or 'upcoming' for the next)
            expect(result.state).not.toBe('current')
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Feature: timestamped-lyrics-sync, Property 5: Word state classification**
   * **Validates: Requirements 5.1, 5.2**
   * 
   * For any aligned word and current playback time, the word should be classified
   * as exactly one of: "current" (startS <= time <= endS), "completed" (endS < time),
   * or "upcoming" (startS > time).
   */
  describe('Property 5: Word state classification', () => {
    it('should classify word as exactly one state', () => {
      fc.assert(
        fc.property(
          alignedWordArbitrary(0),
          fc.integer({ min: 0, max: 50 }),
          (word, time) => {
            const state = classifyWordState(word, time)
            
            // Should be exactly one of the three states
            expect(['current', 'completed', 'upcoming']).toContain(state)
            
            // Verify the classification is correct
            if (time >= word.startS && time <= word.endS) {
              expect(state).toBe('current')
            } else if (time > word.endS) {
              expect(state).toBe('completed')
            } else {
              expect(state).toBe('upcoming')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should classify boundary times correctly', () => {
      fc.assert(
        fc.property(
          alignedWordArbitrary(0),
          (word) => {
            // At start time - should be current
            expect(classifyWordState(word, word.startS)).toBe('current')
            
            // At end time - should be current
            expect(classifyWordState(word, word.endS)).toBe('current')
            
            // Just before start - should be upcoming
            expect(classifyWordState(word, word.startS - 0.001)).toBe('upcoming')
            
            // Just after end - should be completed
            expect(classifyWordState(word, word.endS + 0.001)).toBe('completed')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should ensure states are mutually exclusive and exhaustive', () => {
      fc.assert(
        fc.property(
          alignedWordArbitrary(0),
          fc.integer({ min: -10, max: 400 }),
          (word, time) => {
            const state = classifyWordState(word, time)
            
            // Count how many conditions are true
            const isCurrent = time >= word.startS && time <= word.endS
            const isCompleted = time > word.endS
            const isUpcoming = time < word.startS
            
            // Exactly one condition should be true (mutually exclusive and exhaustive)
            const trueCount = [isCurrent, isCompleted, isUpcoming].filter(Boolean).length
            expect(trueCount).toBe(1)
            
            // The state should match the true condition
            if (isCurrent) expect(state).toBe('current')
            if (isCompleted) expect(state).toBe('completed')
            if (isUpcoming) expect(state).toBe('upcoming')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('calculateWordProgress', () => {
    it('should return progress between 0 and 1 for valid inputs', () => {
      fc.assert(
        fc.property(
          alignedWordArbitrary(0),
          (word) => {
            // Time at start
            expect(calculateWordProgress(word, word.startS)).toBe(0)
            
            // Time at end
            expect(calculateWordProgress(word, word.endS)).toBe(1)
            
            // Time in middle
            const midTime = (word.startS + word.endS) / 2
            const progress = calculateWordProgress(word, midTime)
            expect(progress).toBeGreaterThanOrEqual(0)
            expect(progress).toBeLessThanOrEqual(1)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return 0 for null word', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 300 }),
          (time) => {
            expect(calculateWordProgress(null, time)).toBe(0)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should clamp progress to valid range', () => {
      fc.assert(
        fc.property(
          alignedWordArbitrary(0),
          fc.integer({ min: -100, max: 500 }),
          (word, time) => {
            const progress = calculateWordProgress(word, time)
            expect(progress).toBeGreaterThanOrEqual(0)
            expect(progress).toBeLessThanOrEqual(1)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
