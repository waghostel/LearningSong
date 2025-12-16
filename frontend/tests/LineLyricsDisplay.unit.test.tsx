/**
 * Unit tests for LineLyricsDisplay component
 * 
 * These tests specifically verify the highlighting behavior
 * that was previously tested in the integration tests but
 * had flakiness issues due to async state synchronization.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LineLyricsDisplay } from '@/components/LineLyricsDisplay'
import type { LineCue } from '@/lib/vtt-generator'

Element.prototype.scrollIntoView = jest.fn()

const mockLineCues: LineCue[] = [
  {
    lineIndex: 0,
    text: 'First line of lyrics',
    startTime: 1.0,
    endTime: 1.8,
    isMarker: false,
  },
  {
    lineIndex: 1,
    text: 'Second line of lyrics',
    startTime: 2.0,
    endTime: 2.8,
    isMarker: false,
  },
  {
    lineIndex: 2,
    text: 'Third line of lyrics',
    startTime: 3.0,
    endTime: 3.8,
    isMarker: false,
  },
]

describe('LineLyricsDisplay Unit Tests', () => {
  const mockOnLineClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Line highlighting', () => {
    it('highlights correct line when currentTime is within first line bounds', () => {
      render(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={1.5}
          onLineClick={mockOnLineClick}
          offset={0}
        />
      )

      const firstLine = screen.getByText('First line of lyrics')
      const secondLine = screen.getByText('Second line of lyrics')
      const thirdLine = screen.getByText('Third line of lyrics')

      expect(firstLine).toHaveAttribute('aria-current', 'time')
      expect(secondLine).not.toHaveAttribute('aria-current')
      expect(thirdLine).not.toHaveAttribute('aria-current')
    })

    it('highlights correct line when currentTime is within second line bounds', () => {
      render(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={2.3}
          onLineClick={mockOnLineClick}
          offset={0}
        />
      )

      const firstLine = screen.getByText('First line of lyrics')
      const secondLine = screen.getByText('Second line of lyrics')
      const thirdLine = screen.getByText('Third line of lyrics')

      expect(firstLine).not.toHaveAttribute('aria-current')
      expect(secondLine).toHaveAttribute('aria-current', 'time')
      expect(thirdLine).not.toHaveAttribute('aria-current')
    })

    it('highlights correct line when currentTime is within third line bounds', () => {
      render(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={3.5}
          onLineClick={mockOnLineClick}
          offset={0}
        />
      )

      const firstLine = screen.getByText('First line of lyrics')
      const secondLine = screen.getByText('Second line of lyrics')
      const thirdLine = screen.getByText('Third line of lyrics')

      expect(firstLine).not.toHaveAttribute('aria-current')
      expect(secondLine).not.toHaveAttribute('aria-current')
      expect(thirdLine).toHaveAttribute('aria-current', 'time')
    })

    it('highlights no lines when currentTime is before all lines', () => {
      render(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={0.5}
          onLineClick={mockOnLineClick}
          offset={0}
        />
      )

      const firstLine = screen.getByText('First line of lyrics')
      const secondLine = screen.getByText('Second line of lyrics')
      const thirdLine = screen.getByText('Third line of lyrics')

      expect(firstLine).not.toHaveAttribute('aria-current')
      expect(secondLine).not.toHaveAttribute('aria-current')
      expect(thirdLine).not.toHaveAttribute('aria-current')
    })

    it('highlights no lines when currentTime is after all lines', () => {
      render(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={4.5}
          onLineClick={mockOnLineClick}
          offset={0}
        />
      )

      const firstLine = screen.getByText('First line of lyrics')
      const secondLine = screen.getByText('Second line of lyrics')
      const thirdLine = screen.getByText('Third line of lyrics')

      expect(firstLine).not.toHaveAttribute('aria-current')
      expect(secondLine).not.toHaveAttribute('aria-current')
      expect(thirdLine).not.toHaveAttribute('aria-current')
    })

    it('applies positive offset to currentTime', () => {
      // With offset=500ms (0.5s), currentTime 1.5 becomes adjusted time 2.0
      // This should now highlight second line (2.0 - 2.8)
      render(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={1.5}
          onLineClick={mockOnLineClick}
          offset={500}
        />
      )

      const firstLine = screen.getByText('First line of lyrics')
      const secondLine = screen.getByText('Second line of lyrics')

      expect(firstLine).not.toHaveAttribute('aria-current')
      expect(secondLine).toHaveAttribute('aria-current', 'time')
    })

    it('applies negative offset to currentTime', () => {
      // With offset=-500ms (-0.5s), currentTime 2.5 becomes adjusted time 2.0
      // This should now highlight second line (2.0 - 2.8)
      render(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={2.5}
          onLineClick={mockOnLineClick}
          offset={-500}
        />
      )

      const secondLine = screen.getByText('Second line of lyrics')
      expect(secondLine).toHaveAttribute('aria-current', 'time')
    })
  })

  describe('Click interactions', () => {
    it('calls onLineClick with correct startTime when line is clicked', async () => {
      const user = userEvent.setup()
      render(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={0}
          onLineClick={mockOnLineClick}
          offset={0}
        />
      )

      const secondLine = screen.getByText('Second line of lyrics')
      await user.click(secondLine)

      expect(mockOnLineClick).toHaveBeenCalledWith(2.0)
    })

    it('all lines have button role for accessibility', () => {
      render(
        <LineLyricsDisplay
          lineCues={mockLineCues}
          currentTime={0}
          onLineClick={mockOnLineClick}
          offset={0}
        />
      )

      const firstLine = screen.getByText('First line of lyrics')
      const secondLine = screen.getByText('Second line of lyrics')
      const thirdLine = screen.getByText('Third line of lyrics')

      expect(firstLine).toHaveAttribute('role', 'button')
      expect(secondLine).toHaveAttribute('role', 'button')
      expect(thirdLine).toHaveAttribute('role', 'button')
    })
  })

  describe('Empty state', () => {
    it('displays empty message when no line cues provided', () => {
      render(
        <LineLyricsDisplay
          lineCues={[]}
          currentTime={0}
          onLineClick={mockOnLineClick}
          offset={0}
        />
      )

      expect(screen.getByText('No lyrics lines available')).toBeInTheDocument()
    })
  })
})
