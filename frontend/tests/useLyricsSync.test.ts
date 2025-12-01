/**
 * Unit tests for useLyricsSync hook
 * Tests word-level synchronization with audio playback
 * 
 * _Requirements: 1.2, 4.2_
 */
import { renderHook } from '@testing-library/react'
import { useLyricsSync } from '@/hooks/useLyricsSync'
import type { AlignedWord } from '@/types/lyrics'

// Helper to create aligned words for testing
function createAlignedWord(
  word: string,
  startS: number,
  endS: number
): AlignedWord {
  return {
    word,
    startS,
    endS,
    success: true,
    palign: 0,
  }
}

// Sample aligned words for testing
const sampleAlignedWords: AlignedWord[] = [
  createAlignedWord('Hello', 0, 0.5),
  createAlignedWord('world', 0.6, 1.0),
  createAlignedWord('this', 1.2, 1.5),
  createAlignedWord('is', 1.6, 1.8),
  createAlignedWord('a', 1.9, 2.0),
  createAlignedWord('test', 2.1, 2.5),
]

describe('useLyricsSync hook', () => {
  describe('with various aligned words arrays', () => {
    it('should return correct current word when time is within word range', () => {
      const { result } = renderHook(() =>
        useLyricsSync({
          alignedWords: sampleAlignedWords,
          currentTime: 0.25, // Middle of "Hello"
        })
      )

      expect(result.current.currentWordIndex).toBe(0)
      expect(result.current.currentWord?.word).toBe('Hello')
      expect(result.current.currentWordState).toBe('current')
    })

    it('should return correct word for different time positions', () => {
      const { result, rerender } = renderHook(
        ({ currentTime }) =>
          useLyricsSync({
            alignedWords: sampleAlignedWords,
            currentTime,
          }),
        { initialProps: { currentTime: 0.8 } }
      )

      // Time 0.8 is within "world" (0.6-1.0)
      expect(result.current.currentWord?.word).toBe('world')
      expect(result.current.currentWordState).toBe('current')

      // Update to time 2.3 (within "test")
      rerender({ currentTime: 2.3 })
      expect(result.current.currentWord?.word).toBe('test')
      expect(result.current.currentWordState).toBe('current')
    })

    it('should handle time in gaps between words', () => {
      const { result } = renderHook(() =>
        useLyricsSync({
          alignedWords: sampleAlignedWords,
          currentTime: 1.1, // Gap between "world" (ends 1.0) and "this" (starts 1.2)
        })
      )

      // Should return nearest word (either "world" or "this")
      expect(result.current.currentWord).not.toBeNull()
      expect(['world', 'this']).toContain(result.current.currentWord?.word)
      // State should not be 'current' since we're in a gap
      expect(result.current.currentWordState).not.toBe('current')
    })

    it('should calculate progress correctly', () => {
      const { result } = renderHook(() =>
        useLyricsSync({
          alignedWords: sampleAlignedWords,
          currentTime: 0.25, // 50% through "Hello" (0-0.5)
        })
      )

      expect(result.current.progress).toBeCloseTo(0.5, 1)
    })
  })

  describe('edge cases', () => {
    it('should handle empty aligned words array', () => {
      const { result } = renderHook(() =>
        useLyricsSync({
          alignedWords: [],
          currentTime: 1.0,
        })
      )

      expect(result.current.currentWordIndex).toBe(-1)
      expect(result.current.currentWord).toBeNull()
      expect(result.current.currentWordState).toBe('upcoming')
      expect(result.current.progress).toBe(0)
    })

    it('should handle single word array', () => {
      const singleWord = [createAlignedWord('Only', 1.0, 2.0)]

      // Time before word
      const { result: beforeResult } = renderHook(() =>
        useLyricsSync({
          alignedWords: singleWord,
          currentTime: 0.5,
        })
      )
      expect(beforeResult.current.currentWordIndex).toBe(0)
      expect(beforeResult.current.currentWordState).toBe('upcoming')

      // Time within word
      const { result: duringResult } = renderHook(() =>
        useLyricsSync({
          alignedWords: singleWord,
          currentTime: 1.5,
        })
      )
      expect(duringResult.current.currentWordIndex).toBe(0)
      expect(duringResult.current.currentWordState).toBe('current')
      expect(duringResult.current.progress).toBeCloseTo(0.5, 1)

      // Time after word
      const { result: afterResult } = renderHook(() =>
        useLyricsSync({
          alignedWords: singleWord,
          currentTime: 2.5,
        })
      )
      expect(afterResult.current.currentWordIndex).toBe(0)
      expect(afterResult.current.currentWordState).toBe('completed')
    })

    it('should handle time before first word', () => {
      const wordsStartingLater = [
        createAlignedWord('First', 2.0, 2.5),
        createAlignedWord('Second', 2.6, 3.0),
      ]

      const { result } = renderHook(() =>
        useLyricsSync({
          alignedWords: wordsStartingLater,
          currentTime: 0.5,
        })
      )

      expect(result.current.currentWordIndex).toBe(0)
      expect(result.current.currentWord?.word).toBe('First')
      expect(result.current.currentWordState).toBe('upcoming')
    })

    it('should handle time after last word', () => {
      const { result } = renderHook(() =>
        useLyricsSync({
          alignedWords: sampleAlignedWords,
          currentTime: 10.0, // Well after last word ends at 2.5
        })
      )

      expect(result.current.currentWordIndex).toBe(sampleAlignedWords.length - 1)
      expect(result.current.currentWord?.word).toBe('test')
      expect(result.current.currentWordState).toBe('completed')
    })

    it('should handle time at exact word boundaries', () => {
      // At start of word
      const { result: startResult } = renderHook(() =>
        useLyricsSync({
          alignedWords: sampleAlignedWords,
          currentTime: 0, // Exact start of "Hello"
        })
      )
      expect(startResult.current.currentWordState).toBe('current')

      // At end of word
      const { result: endResult } = renderHook(() =>
        useLyricsSync({
          alignedWords: sampleAlignedWords,
          currentTime: 0.5, // Exact end of "Hello"
        })
      )
      expect(endResult.current.currentWordState).toBe('current')
    })

    it('should handle zero-duration words', () => {
      const wordsWithZeroDuration = [
        createAlignedWord('Instant', 1.0, 1.0), // Zero duration
        createAlignedWord('Normal', 1.5, 2.0),
      ]

      const { result } = renderHook(() =>
        useLyricsSync({
          alignedWords: wordsWithZeroDuration,
          currentTime: 1.0,
        })
      )

      expect(result.current.currentWord?.word).toBe('Instant')
      expect(result.current.currentWordState).toBe('current')
    })
  })

  describe('getWordState function', () => {
    it('should return correct state for any word index', () => {
      const { result } = renderHook(() =>
        useLyricsSync({
          alignedWords: sampleAlignedWords,
          currentTime: 1.5, // Within "this" (1.2-1.5)
        })
      )

      // Words before current time should be completed
      expect(result.current.getWordState(0)).toBe('completed') // "Hello"
      expect(result.current.getWordState(1)).toBe('completed') // "world"

      // Current word
      expect(result.current.getWordState(2)).toBe('current') // "this"

      // Words after current time should be upcoming
      expect(result.current.getWordState(3)).toBe('upcoming') // "is"
      expect(result.current.getWordState(4)).toBe('upcoming') // "a"
      expect(result.current.getWordState(5)).toBe('upcoming') // "test"
    })

    it('should return upcoming for invalid indices', () => {
      const { result } = renderHook(() =>
        useLyricsSync({
          alignedWords: sampleAlignedWords,
          currentTime: 1.0,
        })
      )

      expect(result.current.getWordState(-1)).toBe('upcoming')
      expect(result.current.getWordState(100)).toBe('upcoming')
    })
  })

  describe('memoization', () => {
    it('should return same getWordState function reference when inputs unchanged', () => {
      const { result, rerender } = renderHook(
        ({ alignedWords, currentTime }) =>
          useLyricsSync({ alignedWords, currentTime }),
        {
          initialProps: {
            alignedWords: sampleAlignedWords,
            currentTime: 1.0,
          },
        }
      )

      const firstGetWordState = result.current.getWordState

      // Rerender with same props
      rerender({
        alignedWords: sampleAlignedWords,
        currentTime: 1.0,
      })

      // Function reference should be the same
      expect(result.current.getWordState).toBe(firstGetWordState)
    })

    it('should update getWordState when currentTime changes', () => {
      const { result, rerender } = renderHook(
        ({ currentTime }) =>
          useLyricsSync({
            alignedWords: sampleAlignedWords,
            currentTime,
          }),
        { initialProps: { currentTime: 0.25 } }
      )

      const firstGetWordState = result.current.getWordState

      // Rerender with different time
      rerender({ currentTime: 2.3 })

      // Function reference should change
      expect(result.current.getWordState).not.toBe(firstGetWordState)
    })
  })
})
