import { render, screen, fireEvent, act } from '@testing-library/react'
import { LyricsDisplay, parseLyricsIntoSections, calculateCurrentSection } from '@/components/LyricsDisplay'

// Mock scrollIntoView
const mockScrollIntoView = jest.fn()
Element.prototype.scrollIntoView = mockScrollIntoView

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('LyricsDisplay Component', () => {
  const sampleLyrics = `First verse of the song
with multiple lines

Second verse continues here
more content

Third verse ends the song
final lines`

  describe('rendering', () => {
    it('renders lyrics display with sections', () => {
      render(<LyricsDisplay lyrics={sampleLyrics} currentTime={0} duration={180} />)

      expect(screen.getByRole('region', { name: /lyrics display/i })).toBeInTheDocument()
      expect(screen.getByText(/First verse/)).toBeInTheDocument()
      expect(screen.getByText(/Second verse/)).toBeInTheDocument()
      expect(screen.getByText(/Third verse/)).toBeInTheDocument()
    })

    it('displays "No lyrics available" when lyrics are empty', () => {
      render(<LyricsDisplay lyrics="" currentTime={0} duration={180} />)

      expect(screen.getByText(/No lyrics available/i)).toBeInTheDocument()
    })

    it('displays "No lyrics available" for whitespace-only lyrics', () => {
      const whitespaceOnlyLyrics = '   \n\n   '
      render(<LyricsDisplay lyrics={whitespaceOnlyLyrics} currentTime={0} duration={180} />)

      // Verify parseLyricsIntoSections returns empty for this input
      expect(parseLyricsIntoSections(whitespaceOnlyLyrics)).toHaveLength(0)
      expect(screen.getByText(/No lyrics available/i)).toBeInTheDocument()
    })
  })

  describe('section highlighting', () => {
    it('highlights first section at time 0', () => {
      render(<LyricsDisplay lyrics={sampleLyrics} currentTime={0} duration={180} />)

      const sections = screen.getAllByText(/verse/)
      expect(sections[0].closest('[data-section-index]')).toHaveAttribute('aria-current', 'true')
    })

    it('highlights middle section at middle time', () => {
      render(<LyricsDisplay lyrics={sampleLyrics} currentTime={90} duration={180} />)

      const section = screen.getByText(/Second verse/).closest('[data-section-index]')
      expect(section).toHaveAttribute('aria-current', 'true')
    })

    it('highlights last section near end time', () => {
      render(<LyricsDisplay lyrics={sampleLyrics} currentTime={175} duration={180} />)

      const section = screen.getByText(/Third verse/).closest('[data-section-index]')
      expect(section).toHaveAttribute('aria-current', 'true')
    })

    it('applies highlight styling to current section', () => {
      render(<LyricsDisplay lyrics={sampleLyrics} currentTime={0} duration={180} />)

      const currentSection = screen.getByText(/First verse/).closest('[data-section-index]')
      expect(currentSection).toHaveClass('bg-primary/10')
      expect(currentSection).toHaveClass('border-primary')
    })
  })

  describe('auto-scroll behavior', () => {
    it('scrolls to current section on time update', () => {
      const { rerender } = render(
        <LyricsDisplay lyrics={sampleLyrics} currentTime={0} duration={180} />
      )

      // Update time to trigger section change
      rerender(<LyricsDisplay lyrics={sampleLyrics} currentTime={90} duration={180} />)

      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
      })
    })
  })

  describe('manual scroll detection', () => {
    it('calls onManualScroll when user scrolls', () => {
      const onManualScroll = jest.fn()
      render(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={0}
          duration={180}
          onManualScroll={onManualScroll}
        />
      )

      const container = screen.getByRole('region', { name: /lyrics display/i })
      
      // Wait for auto-scroll flag to reset
      act(() => {
        jest.advanceTimersByTime(600)
      })
      
      fireEvent.scroll(container)

      expect(onManualScroll).toHaveBeenCalled()
    })

    it('re-enables auto-scroll after 5 seconds of no manual scroll', () => {
      const { rerender } = render(
        <LyricsDisplay lyrics={sampleLyrics} currentTime={0} duration={180} />
      )

      const container = screen.getByRole('region', { name: /lyrics display/i })
      
      // Wait for initial auto-scroll to complete
      act(() => {
        jest.advanceTimersByTime(600)
      })
      
      // Trigger manual scroll
      fireEvent.scroll(container)
      mockScrollIntoView.mockClear()

      // Update time - should not auto-scroll yet
      rerender(<LyricsDisplay lyrics={sampleLyrics} currentTime={90} duration={180} />)
      
      // Advance time by 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000)
      })

      // Now update time again - should auto-scroll
      rerender(<LyricsDisplay lyrics={sampleLyrics} currentTime={120} duration={180} />)

      expect(mockScrollIntoView).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<LyricsDisplay lyrics={sampleLyrics} currentTime={0} duration={180} />)

      const container = screen.getByRole('region', { name: /lyrics display/i })
      expect(container).toHaveAttribute('aria-live', 'polite')
    })

    it('announces current section for screen readers', () => {
      render(<LyricsDisplay lyrics={sampleLyrics} currentTime={0} duration={180} />)

      expect(screen.getByText(/Now playing section 1 of 3/i)).toBeInTheDocument()
    })
  })
})

describe('parseLyricsIntoSections utility', () => {
  it('splits lyrics by double newlines', () => {
    const lyrics = 'Section 1\n\nSection 2\n\nSection 3'
    const sections = parseLyricsIntoSections(lyrics)

    expect(sections).toHaveLength(3)
    expect(sections[0]).toBe('Section 1')
    expect(sections[1]).toBe('Section 2')
    expect(sections[2]).toBe('Section 3')
  })

  it('splits lyrics by verse markers', () => {
    const lyrics = '[Verse 1]\nFirst verse\n[Chorus]\nChorus part\n[Verse 2]\nSecond verse'
    const sections = parseLyricsIntoSections(lyrics)

    expect(sections.length).toBeGreaterThanOrEqual(1)
    expect(sections.some((s) => s.includes('First verse'))).toBe(true)
  })

  it('returns single section for lyrics without breaks', () => {
    const lyrics = 'Single line lyrics without any breaks'
    const sections = parseLyricsIntoSections(lyrics)

    expect(sections).toHaveLength(1)
    expect(sections[0]).toBe(lyrics)
  })

  it('returns empty array for empty string', () => {
    expect(parseLyricsIntoSections('')).toHaveLength(0)
  })

  it('trims whitespace from sections', () => {
    const lyrics = '  Section 1  \n\n  Section 2  '
    const sections = parseLyricsIntoSections(lyrics)

    expect(sections[0]).toBe('Section 1')
    expect(sections[1]).toBe('Section 2')
  })
})

describe('calculateCurrentSection utility', () => {
  it('returns 0 for time 0', () => {
    expect(calculateCurrentSection(0, 180, 3)).toBe(0)
  })

  it('returns last section index for time equal to duration', () => {
    expect(calculateCurrentSection(180, 180, 3)).toBe(2)
  })

  it('returns middle section for middle time', () => {
    expect(calculateCurrentSection(90, 180, 3)).toBe(1)
  })

  it('returns 0 for negative time', () => {
    expect(calculateCurrentSection(-10, 180, 3)).toBe(0)
  })

  it('returns 0 for zero duration', () => {
    expect(calculateCurrentSection(50, 0, 3)).toBe(0)
  })

  it('returns 0 for zero sections', () => {
    expect(calculateCurrentSection(50, 180, 0)).toBe(0)
  })

  it('clamps to last section when time exceeds duration', () => {
    expect(calculateCurrentSection(200, 180, 3)).toBe(2)
  })
})
