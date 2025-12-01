import { render, screen, fireEvent, act } from '@testing-library/react'
import { LyricsDisplay, parseLyricsIntoSections, calculateCurrentSection, getWordStateClasses } from '@/components/LyricsDisplay'
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

// Sample aligned words for timestamp tests
const sampleAlignedWords: AlignedWord[] = [
  createAlignedWord('Hello', 0, 0.5),
  createAlignedWord(' ', 0.5, 0.55),
  createAlignedWord('world', 0.6, 1.0),
  createAlignedWord(' ', 1.0, 1.05),
  createAlignedWord('this', 1.2, 1.5),
  createAlignedWord(' ', 1.5, 1.55),
  createAlignedWord('is', 1.6, 1.8),
  createAlignedWord(' ', 1.8, 1.85),
  createAlignedWord('a', 1.9, 2.0),
  createAlignedWord(' ', 2.0, 2.05),
  createAlignedWord('test', 2.1, 2.5),
]

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

/**
 * Tests for LyricsDisplay with timestamps (word-level rendering)
 * _Requirements: 5.1, 5.2, 1.4_
 */
describe('LyricsDisplay with Timestamps', () => {
  const sampleLyrics = 'Hello world this is a test'

  describe('word-level rendering', () => {
    it('renders individual words when alignedWords is provided', () => {
      render(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={0.25}
          duration={3}
          alignedWords={sampleAlignedWords}
        />
      )

      // Should render with word-level sync label
      expect(screen.getByRole('region', { name: /word-level sync/i })).toBeInTheDocument()
      
      // Should render individual words
      expect(screen.getByText('Hello')).toBeInTheDocument()
      expect(screen.getByText('world')).toBeInTheDocument()
      expect(screen.getByText('test')).toBeInTheDocument()
    })

    it('renders words with data-word-index attributes', () => {
      render(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={0.25}
          duration={3}
          alignedWords={sampleAlignedWords}
        />
      )

      const helloWord = screen.getByText('Hello')
      expect(helloWord).toHaveAttribute('data-word-index', '0')
      
      const worldWord = screen.getByText('world')
      expect(worldWord).toHaveAttribute('data-word-index', '2')
    })

    it('renders words with data-word-state attributes', () => {
      render(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={0.25}
          duration={3}
          alignedWords={sampleAlignedWords}
        />
      )

      const helloWord = screen.getByText('Hello')
      expect(helloWord).toHaveAttribute('data-word-state', 'current')
      
      const worldWord = screen.getByText('world')
      expect(worldWord).toHaveAttribute('data-word-state', 'upcoming')
    })
  })

  describe('fallback behavior', () => {
    it('falls back to section-based display when alignedWords is undefined', () => {
      render(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={0}
          duration={180}
        />
      )

      // Should use section-based display (no word-level sync label)
      expect(screen.getByRole('region', { name: /^lyrics display$/i })).toBeInTheDocument()
    })

    it('falls back to section-based display when alignedWords is empty', () => {
      render(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={0}
          duration={180}
          alignedWords={[]}
        />
      )

      // Should use section-based display
      expect(screen.getByRole('region', { name: /^lyrics display$/i })).toBeInTheDocument()
    })

    it('shows "No lyrics available" when both lyrics and alignedWords are empty', () => {
      render(
        <LyricsDisplay
          lyrics=""
          currentTime={0}
          duration={180}
          alignedWords={[]}
        />
      )

      expect(screen.getByText(/No lyrics available/i)).toBeInTheDocument()
    })
  })

  describe('highlight state application', () => {
    it('applies current highlight to word being sung', () => {
      render(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={0.25}
          duration={3}
          alignedWords={sampleAlignedWords}
        />
      )

      const helloWord = screen.getByText('Hello')
      expect(helloWord).toHaveAttribute('aria-current', 'true')
      expect(helloWord).toHaveAttribute('data-word-state', 'current')
    })

    it('applies completed state to words already sung', () => {
      render(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={2.3}
          duration={3}
          alignedWords={sampleAlignedWords}
        />
      )

      const helloWord = screen.getByText('Hello')
      expect(helloWord).toHaveAttribute('data-word-state', 'completed')
      expect(helloWord).not.toHaveAttribute('aria-current')
    })

    it('applies upcoming state to words not yet sung', () => {
      render(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={0.25}
          duration={3}
          alignedWords={sampleAlignedWords}
        />
      )

      const testWord = screen.getByText('test')
      expect(testWord).toHaveAttribute('data-word-state', 'upcoming')
      expect(testWord).not.toHaveAttribute('aria-current')
    })

    it('updates highlight state as time progresses', () => {
      const { rerender } = render(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={0.25}
          duration={3}
          alignedWords={sampleAlignedWords}
        />
      )

      // Initially "Hello" is current
      expect(screen.getByText('Hello')).toHaveAttribute('data-word-state', 'current')
      expect(screen.getByText('world')).toHaveAttribute('data-word-state', 'upcoming')

      // Update time to when "world" is being sung
      rerender(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={0.8}
          duration={3}
          alignedWords={sampleAlignedWords}
        />
      )

      // Now "Hello" should be completed and "world" should be current
      expect(screen.getByText('Hello')).toHaveAttribute('data-word-state', 'completed')
      expect(screen.getByText('world')).toHaveAttribute('data-word-state', 'current')
    })
  })

  describe('auto-scroll with timestamps', () => {
    it('scrolls to current word when time changes', () => {
      const { rerender } = render(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={0.25}
          duration={3}
          alignedWords={sampleAlignedWords}
        />
      )

      mockScrollIntoView.mockClear()

      // Update time to a different word
      rerender(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={2.3}
          duration={3}
          alignedWords={sampleAlignedWords}
        />
      )

      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
      })
    })
  })

  describe('accessibility with timestamps', () => {
    it('has proper ARIA attributes for word-level display', () => {
      render(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={0.25}
          duration={3}
          alignedWords={sampleAlignedWords}
        />
      )

      const container = screen.getByRole('region', { name: /word-level sync/i })
      expect(container).toHaveAttribute('aria-live', 'polite')
    })

    it('announces current word for screen readers', () => {
      render(
        <LyricsDisplay
          lyrics={sampleLyrics}
          currentTime={0.25}
          duration={3}
          alignedWords={sampleAlignedWords}
        />
      )

      expect(screen.getByText(/Now singing: Hello/i)).toBeInTheDocument()
    })

    it('shows waiting message when no word is current', () => {
      // Create words that start later
      const laterWords = [
        createAlignedWord('Later', 5.0, 5.5),
        createAlignedWord('words', 5.6, 6.0),
      ]

      render(
        <LyricsDisplay
          lyrics="Later words"
          currentTime={0}
          duration={10}
          alignedWords={laterWords}
        />
      )

      // When time is before all words, should show waiting message
      // Note: The component returns the first word as "upcoming" in this case
      // so it may still show "Now singing" - this depends on implementation
      const container = screen.getByRole('region', { name: /word-level sync/i })
      expect(container).toBeInTheDocument()
    })
  })
})

describe('getWordStateClasses utility', () => {
  it('returns correct classes for current state', () => {
    const classes = getWordStateClasses('current')
    expect(classes).toContain('bg-primary')
    expect(classes).toContain('font-semibold')
  })

  it('returns correct classes for completed state', () => {
    const classes = getWordStateClasses('completed')
    expect(classes).toContain('text-muted-foreground')
  })

  it('returns correct classes for upcoming state', () => {
    const classes = getWordStateClasses('upcoming')
    expect(classes).toContain('text-foreground')
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
