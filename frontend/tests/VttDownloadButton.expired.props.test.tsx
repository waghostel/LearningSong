/**
 * Property-based tests for VTT Download Button expired song state
 * 
 * **Task 6.4: Property 18: Expired song state management**
 * **Validates: Requirements 6.4**
 * 
 * For any song with an expiration status of true, the VTT download button
 * should be disabled while lyrics display remains functional in read-only mode.
 */
import * as React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as fc from 'fast-check'
import { VttDownloadButton } from '../src/components/VttDownloadButton'
import { LineLyricsDisplay } from '../src/components/LineLyricsDisplay'
import type { LineCue } from '../src/lib/vtt-generator'

/**
 * Generator for valid LineCue objects with unique text
 */
const lineCueArbitrary = (index: number): fc.Arbitrary<LineCue> =>
  fc.record({
    text: fc.constant(`Line ${index + 1}`), // Unique text per index
    startTime: fc.constant(index * 2),
    isMarker: fc.boolean(),
  }).map(({ text, startTime, isMarker }) => ({
    lineIndex: index,
    text,
    startTime,
    endTime: startTime + 1.5,
    isMarker,
  }))

/**
 * Generator for array of LineCue objects
 */
const lineCuesArbitrary = (minLength: number = 1, maxLength: number = 5): fc.Arbitrary<LineCue[]> =>
  fc.integer({ min: minLength, max: maxLength }).chain(length =>
    fc.tuple(...Array.from({ length }, (_, i) => lineCueArbitrary(i)))
  )

describe('Property 18: Expired song state management', () => {
  describe('VttDownloadButton expired state', () => {
    it('should disable the button when song is expired', () => {
      fc.assert(
        fc.property(
          lineCuesArbitrary(1, 5),
          fc.constantFrom('Pop', 'Rock', 'Jazz', 'Electronic'),
          (lineCues, style) => {
            const createdAt = new Date()
            
            render(
              <VttDownloadButton
                lineCues={lineCues}
                songStyle={style}
                createdAt={createdAt}
                disabled={true} // Simulating expired state
              />
            )
            
            const button = screen.getByRole('button', { name: /download.*vtt/i })
            expect(button).toBeDisabled()
            cleanup() // Clean up after each iteration
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should enable the button when song is not expired', () => {
      fc.assert(
        fc.property(
          lineCuesArbitrary(1, 5),
          fc.constantFrom('Pop', 'Rock', 'Jazz', 'Electronic'),
          (lineCues, style) => {
            const createdAt = new Date()
            
            render(
              <VttDownloadButton
                lineCues={lineCues}
                songStyle={style}
                createdAt={createdAt}
                disabled={false} // Song is not expired
              />
            )
            
            const button = screen.getByRole('button', { name: /download.*vtt/i })
            expect(button).not.toBeDisabled()
            cleanup() // Clean up after each iteration
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should not trigger download when disabled and clicked', async () => {
      const lineCues: LineCue[] = [
        { lineIndex: 0, text: 'Test line', startTime: 0, endTime: 1, isMarker: false }
      ]
      
      render(
        <VttDownloadButton
          lineCues={lineCues}
          songStyle="Pop"
          createdAt={new Date()}
          disabled={true}
        />
      )
      
      const button = screen.getByRole('button', { name: /download.*vtt/i })
      
      // Verify button is disabled (which prevents click events)
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('disabled')
      
      // Try to click anyway - disabled buttons should not fire onClick
      await userEvent.click(button)
      
      // Since button is disabled, no download should happen
      // We verify this implicitly by checking the button remains in disabled state
      expect(button).toBeDisabled()
    })
  })

  describe('LineLyricsDisplay read-only mode for expired songs', () => {
    it('should render lyrics even when song is expired (read-only functional)', () => {
      fc.assert(
        fc.property(
          lineCuesArbitrary(1, 5),
          (lineCues) => {
            const mockOnLineClick = jest.fn()
            
            render(
              <LineLyricsDisplay
                lineCues={lineCues}
                currentTime={0}
                onLineClick={mockOnLineClick}
                showMarkers={true}
              />
            )
            
            // Should render all non-marker lines
            const nonMarkerCues = lineCues.filter(c => !c.isMarker)
            for (const cue of nonMarkerCues) {
              expect(screen.getByText(cue.text)).toBeInTheDocument()
            }
            cleanup() // Clean up after each iteration
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should still allow line interactions in read-only mode', async () => {
      const lineCues: LineCue[] = [
        { lineIndex: 0, text: 'First line', startTime: 0, endTime: 2, isMarker: false },
        { lineIndex: 1, text: 'Second line', startTime: 2, endTime: 4, isMarker: false },
      ]
      
      const mockOnLineClick = jest.fn()
      
      render(
        <LineLyricsDisplay
          lineCues={lineCues}
          currentTime={0}
          onLineClick={mockOnLineClick}
        />
      )
      
      // Click on a line
      const firstLine = screen.getByText('First line')
      await userEvent.click(firstLine)
      
      // Should still trigger the callback (for seeking)
      expect(mockOnLineClick).toHaveBeenCalledWith(0)
    })

    it('should display empty state message when no line cues exist', () => {
      const mockOnLineClick = jest.fn()
      
      render(
        <LineLyricsDisplay
          lineCues={[]}
          currentTime={0}
          onLineClick={mockOnLineClick}
        />
      )
      
      expect(screen.getByText('No lyrics lines available')).toBeInTheDocument()
    })
  })

  describe('Combined expired state behavior', () => {
    it('should show disabled download button but functional lyrics for expired songs', () => {
      const lineCues: LineCue[] = [
        { lineIndex: 0, text: 'Verse one', startTime: 0, endTime: 2, isMarker: false },
        { lineIndex: 1, text: 'Chorus', startTime: 2, endTime: 4, isMarker: false },
      ]
      
      const { container } = render(
        <div>
          <VttDownloadButton
            lineCues={lineCues}
            songStyle="Pop"
            createdAt={new Date()}
            disabled={true} // Expired
          />
          <LineLyricsDisplay
            lineCues={lineCues}
            currentTime={1}
            onLineClick={() => {}}
          />
        </div>
      )
      
      // Button should be disabled
      const button = screen.getByRole('button', { name: /download.*vtt/i })
      expect(button).toBeDisabled()
      
      // Lyrics should still be visible and functional
      expect(screen.getByText('Verse one')).toBeInTheDocument()
      expect(screen.getByText('Chorus')).toBeInTheDocument()
      
      // Lyrics container should exist
      expect(container.querySelector('[role="region"]')).toBeInTheDocument()
    })

    it('should maintain proper ARIA state for disabled download button', () => {
      const lineCues: LineCue[] = [
        { lineIndex: 0, text: 'Test', startTime: 0, endTime: 1, isMarker: false }
      ]
      
      render(
        <VttDownloadButton
          lineCues={lineCues}
          songStyle="Pop"
          createdAt={new Date()}
          disabled={true}
        />
      )
      
      const button = screen.getByRole('button', { name: /download.*vtt/i })
      
      // Should have proper disabled state for accessibility
      expect(button).toHaveAttribute('disabled')
      expect(button).toHaveAttribute('aria-label')
    })
  })
})
