/**
 * Property-based tests for LyricsDisplay component
 * **Feature: song-playback-improvements, Property 17: Screen reader offset announcement**
 * **Validates: Requirements 11.5**
 */

import { render } from '@testing-library/react'
import { LyricsDisplay } from '@/components/LyricsDisplay'
import type { AlignedWord } from '@/types/lyrics'
import fc from 'fast-check'

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

describe('LyricsDisplay Property Tests', () => {
  /**
   * Property 17: Screen reader offset announcement
   * For any non-zero offset value, the screen reader announcement should include
   * the offset value with proper sign formatting
   */
  it('announces offset changes to screen readers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -2000, max: 2000 }).filter(n => n !== 0),
        (offset) => {
          const sampleWords: AlignedWord[] = [
            createAlignedWord('Hello', 0, 0.5),
            createAlignedWord(' ', 0.5, 0.55),
            createAlignedWord('world', 0.6, 1.0),
          ]

          const { container } = render(
            <LyricsDisplay
              lyrics="Hello world"
              currentTime={0.25}
              duration={3}
              alignedWords={sampleWords}
              offset={offset}
            />
          )

          // Find the screen reader announcement for offset
          const srOnlyElements = container.querySelectorAll('.sr-only')
          const offsetAnnouncement = Array.from(srOnlyElements).find(el =>
            el.textContent?.includes('Lyrics timing offset')
          )

          // Should have an announcement
          expect(offsetAnnouncement).toBeTruthy()

          // Should include the offset value
          expect(offsetAnnouncement?.textContent).toContain(`${offset}`)

          // Should include "milliseconds"
          expect(offsetAnnouncement?.textContent).toContain('milliseconds')

          // Should have proper sign for positive values
          if (offset > 0) {
            expect(offsetAnnouncement?.textContent).toContain('+')
          }

          // Should have aria-live="polite" for non-intrusive announcements
          expect(offsetAnnouncement).toHaveAttribute('aria-live', 'polite')
          expect(offsetAnnouncement).toHaveAttribute('aria-atomic', 'true')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: No offset announcement when offset is zero
   * For offset = 0, there should be no offset announcement to avoid clutter
   */
  it('does not announce offset when it is zero', () => {
    const sampleWords: AlignedWord[] = [
      createAlignedWord('Hello', 0, 0.5),
      createAlignedWord(' ', 0.5, 0.55),
      createAlignedWord('world', 0.6, 1.0),
    ]

    const { container } = render(
      <LyricsDisplay
        lyrics="Hello world"
        currentTime={0.25}
        duration={3}
        alignedWords={sampleWords}
        offset={0}
      />
    )

    // Find the screen reader announcement for offset
    const srOnlyElements = container.querySelectorAll('.sr-only')
    const offsetAnnouncement = Array.from(srOnlyElements).find(el =>
      el.textContent?.includes('Lyrics timing offset')
    )

    // Should NOT have an offset announcement when offset is 0
    expect(offsetAnnouncement).toBeFalsy()
  })

  /**
   * Property: Offset is applied to highlighting
   * For any offset value, the word highlighting should use the adjusted time
   */
  it('applies offset to word highlighting', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -2000, max: 2000 }),
        fc.float({ min: 0, max: 10 }),
        (offset, currentTime) => {
          const sampleWords: AlignedWord[] = [
            createAlignedWord('First', 0, 1),
            createAlignedWord(' ', 1, 1.05),
            createAlignedWord('Second', 1.1, 2),
            createAlignedWord(' ', 2, 2.05),
            createAlignedWord('Third', 2.1, 3),
          ]

          const { container } = render(
            <LyricsDisplay
              lyrics="First Second Third"
              currentTime={currentTime}
              duration={10}
              alignedWords={sampleWords}
              offset={offset}
            />
          )

          // Calculate adjusted time
          const adjustedTime = currentTime + (offset / 1000)

          // Find which word should be current based on adjusted time
          let expectedCurrentWord: string | null = null
          for (const word of sampleWords) {
            if (adjustedTime >= word.startS && adjustedTime <= word.endS) {
              expectedCurrentWord = word.word.trim()
              break
            }
          }

          // If we found an expected current word, verify it's marked as current
          if (expectedCurrentWord && expectedCurrentWord.length > 0) {
            const wordElements = container.querySelectorAll('[data-word-state="current"]')
            const currentWords = Array.from(wordElements).map(el => el.textContent?.trim())
            
            // The current word should be in the list of highlighted words
            expect(currentWords).toContain(expectedCurrentWord)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
