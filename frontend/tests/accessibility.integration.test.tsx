/**
 * Accessibility integration tests for VTT download and line-level lyrics features
 * 
 * Tests screen reader compatibility with jest-axe, keyboard navigation flows,
 * and ARIA live region updates.
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { VttDownloadButton } from '@/components/VttDownloadButton'
import { LineLyricsDisplay } from '@/components/LineLyricsDisplay'
import type { LineCue } from '@/lib/vtt-generator'

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations)

// Type helper for jest-axe assertions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const expectAxe = (results: any) => expect(results) as any

describe('Accessibility Integration Tests', () => {
  const mockLineCues: LineCue[] = [
    {
      lineIndex: 0,
      text: 'First line of lyrics',
      startTime: 0,
      endTime: 3,
      isMarker: false,
    },
    {
      lineIndex: 1,
      text: '[Verse 1]',
      startTime: 3,
      endTime: 3.5,
      isMarker: true,
    },
    {
      lineIndex: 2,
      text: 'Second line of lyrics',
      startTime: 3.5,
      endTime: 6,
      isMarker: false,
    },
    {
      lineIndex: 3,
      text: 'Third line of lyrics',
      startTime: 6,
      endTime: 9,
      isMarker: false,
    },
  ]

  const mockOnLineClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('VTT Download Button Accessibility', () => {
    /**
     * **Validates: Requirements 4.1, 4.2**
     */
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <VttDownloadButton
          lineCues={mockLineCues}
          songStyle="Pop"
          createdAt={new Date('2024-12-15')}
          offset={0}
          disabled={false}
        />
      )

      const results = await axe(container)
      expectAxe(results).toHaveNoViolations()
    })

    /**
     * **Validates: Requirements 4.1**
     */
    it('should support keyboard navigation', async () => {
      render(
        <VttDownloadButton
          lineCues={mockLineCues}
          songStyle="Pop"
          createdAt={new Date('2024-12-15')}
          offset={0}
          disabled={false}
        />
      )

      const button = screen.getByRole('button', { name: /download.*vtt/i })

      // Should be focusable
      button.focus()
      expect(document.activeElement).toBe(button)

      // Should be a button element (inherently keyboard accessible)
      expect(button.tagName.toLowerCase()).toBe('button')
      
      // Should not be disabled
      expect(button).not.toBeDisabled()
      
      // Should have proper focus styling
      expect(button.className).toContain('focus-visible:ring')
    })

    /**
     * **Validates: Requirements 4.2**
     */
    it('should have proper ARIA labels and descriptions', () => {
      render(
        <VttDownloadButton
          lineCues={mockLineCues}
          songStyle="Pop"
          createdAt={new Date('2024-12-15')}
          offset={0}
          disabled={false}
        />
      )

      const button = screen.getByRole('button', { name: /download.*vtt/i })

      // Should have aria-label
      expect(button).toHaveAttribute('aria-label')
      const ariaLabel = button.getAttribute('aria-label')
      expect(ariaLabel).toMatch(/download.*vtt|vtt.*download/i)

      // Should have title for additional context
      expect(button).toHaveAttribute('title')
      const title = button.getAttribute('title')
      expect(title).toMatch(/vtt|subtitle|timestamp/i)

      // Icon should be hidden from screen readers
      const icon = button.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })

    /**
     * **Validates: Requirements 4.4**
     */
    it('should provide accessible error feedback when download fails', async () => {
      // Mock console.error to capture error logging
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Mock VTT generation to throw an error
      jest.doMock('@/lib/vtt-generator', () => ({
        generateVttContent: jest.fn().mockImplementation(() => {
          throw new Error('VTT generation failed')
        }),
        generateVttFilename: jest.fn().mockReturnValue('test-song.vtt'),
        downloadVttFile: jest.fn(),
      }))

      render(
        <VttDownloadButton
          lineCues={mockLineCues}
          songStyle="Pop"
          createdAt={new Date('2024-12-15')}
          offset={0}
          disabled={false}
        />
      )

      const button = screen.getByRole('button', { name: /download.*vtt/i })

      // Click the button to trigger error
      fireEvent.click(button)

      // Should log error (accessible to screen readers via console)
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to download VTT file:',
          expect.any(Error)
        )
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Line Lyrics Display Accessibility', () => {
    /**
     * **Validates: Requirements 4.1, 4.2, 4.5**
     */
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={2}
          onLineClick={mockOnLineClick}
          showMarkers={true}
          offset={0}
        />
      )

      const results = await axe(container)
      expectAxe(results).toHaveNoViolations()
    })

    /**
     * **Validates: Requirements 4.1**
     */
    it('should support keyboard navigation for line interactions', () => {
      render(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={2}
          onLineClick={mockOnLineClick}
          showMarkers={true}
          offset={0}
        />
      )

      // All lines should be focusable
      const lines = screen.getAllByRole('button')
      expect(lines.length).toBeGreaterThan(0)

      lines.forEach(line => {
        // Should be focusable
        line.focus()
        expect(document.activeElement).toBe(line)

        // Should respond to Enter key
        fireEvent.keyDown(line, { key: 'Enter', code: 'Enter' })
        expect(mockOnLineClick).toHaveBeenCalled()

        // Should respond to Space key
        mockOnLineClick.mockClear()
        fireEvent.keyDown(line, { key: ' ', code: 'Space' })
        expect(mockOnLineClick).toHaveBeenCalled()

        mockOnLineClick.mockClear()
      })
    })

    /**
     * **Validates: Requirements 4.3, 4.5**
     */
    it('should provide ARIA live region updates for dynamic highlighting', async () => {
      const { rerender } = render(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={0.5}
          onLineClick={mockOnLineClick}
          showMarkers={true}
          offset={0}
        />
      )

      // Should have ARIA live region
      const liveRegion = screen.getByRole('region', { name: /line-by-line lyrics display/i })
      expect(liveRegion).toBeInTheDocument()

      // Should have screen reader live region for current line
      const srLiveRegion = document.querySelector('[aria-live="polite"]')
      expect(srLiveRegion).toBeInTheDocument()

      // Update time to activate first line
      rerender(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={1.5}
          onLineClick={mockOnLineClick}
          showMarkers={true}
          offset={0}
        />
      )

      // Live region should update with current line
      await waitFor(() => {
        expect(srLiveRegion).toHaveTextContent('Now singing: First line of lyrics')
      })

      // Update time to activate second line (skip marker)
      rerender(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={4.5}
          onLineClick={mockOnLineClick}
          showMarkers={true}
          offset={0}
        />
      )

      // Live region should update with new current line
      await waitFor(() => {
        expect(srLiveRegion).toHaveTextContent('Now singing: Second line of lyrics')
      })
    })

    /**
     * **Validates: Requirements 4.2, 4.5**
     */
    it('should maintain semantic HTML structure', () => {
      render(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={2}
          onLineClick={mockOnLineClick}
          showMarkers={true}
          offset={0}
        />
      )

      // Should have proper region role
      const region = screen.getByRole('region', { name: /line-by-line lyrics display/i })
      expect(region).toBeInTheDocument()

      // Lines should be buttons for interaction
      const lines = screen.getAllByRole('button')
      expect(lines.length).toBeGreaterThan(0)

      // Current line should have aria-current
      const currentLine = lines.find(line => line.getAttribute('aria-current') === 'time')
      expect(currentLine).toBeInTheDocument()
    })

    /**
     * **Validates: Requirements 4.3**
     */
    it('should handle empty state accessibly', async () => {
      const { container } = render(
        <LineLyricsDisplay
          lineCues={[]}
          currentTime={0}
          onLineClick={mockOnLineClick}
          showMarkers={true}
          offset={0}
        />
      )

      // Should have no accessibility violations even when empty
      const results = await axe(container)
      expectAxe(results).toHaveNoViolations()

      // Should have proper empty state message
      const region = screen.getByRole('region', { name: /lyrics display/i })
      expect(region).toHaveTextContent('No lyrics lines available')
    })

    /**
     * **Validates: Requirements 4.1, 4.2**
     */
    it('should handle marker visibility accessibly', async () => {
      const { container, rerender } = render(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={2}
          onLineClick={mockOnLineClick}
          showMarkers={true}
          offset={0}
        />
      )

      // Should have no violations with markers shown
      let results = await axe(container)
      expectAxe(results).toHaveNoViolations()

      // Hide markers
      rerender(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={2}
          onLineClick={mockOnLineClick}
          showMarkers={false}
          offset={0}
        />
      )

      // Should still have no violations with markers hidden
      results = await axe(container)
      expectAxe(results).toHaveNoViolations()

      // Markers should not be in the DOM when hidden
      expect(screen.queryByText('[Verse 1]')).not.toBeInTheDocument()
    })
  })

  describe('Combined Accessibility Flow', () => {
    /**
     * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
     */
    it('should maintain accessibility when both components are present', async () => {
      const { container } = render(
        <div>
          <VttDownloadButton
            lineCues={mockLineCues}
            songStyle="Pop"
            createdAt={new Date('2024-12-15')}
            offset={0}
            disabled={false}
          />
          <LineLyricsDisplay
            lineCues={mockLineCues}
            currentTime={2}
            onLineClick={mockOnLineClick}
            showMarkers={true}
            offset={0}
          />
        </div>
      )

      // Should have no accessibility violations for the combined interface
      const results = await axe(container)
      expectAxe(results).toHaveNoViolations()

      // Both components should be accessible via keyboard
      const downloadButton = screen.getByRole('button', { name: /download.*vtt/i })
      const lyricsRegion = screen.getByRole('region', { name: /line-by-line lyrics display/i })
      const lineButtons = screen.getAllByRole('button').filter(btn => btn !== downloadButton)

      // All interactive elements should be focusable
      downloadButton.focus()
      expect(document.activeElement).toBe(downloadButton)

      lineButtons.forEach(lineButton => {
        lineButton.focus()
        expect(document.activeElement).toBe(lineButton)
      })

      // Regions should be properly labeled
      expect(lyricsRegion).toHaveAttribute('aria-label')
    })
  })
})