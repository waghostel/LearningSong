import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { GenerateButton } from '@/components/GenerateButton'
import { useTextInputStore } from '@/stores/textInputStore'
import { useGenerateLyrics, useRateLimit } from '@/hooks/useLyrics'

// Mock dependencies
jest.mock('@/stores/textInputStore')
jest.mock('@/hooks/useLyrics')
jest.mock('@/lib/toast-utils', () => ({
  showValidationError: jest.fn(),
  showRateLimitError: jest.fn(),
}))

// Helper to render with Router
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('GenerateButton Component', () => {
  const mockGenerateLyrics = jest.fn()
  const mockSetGenerating = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      content: 'Test content',
      isGenerating: false,
      setGenerating: mockSetGenerating,
      searchEnabled: false,
    })
    
    ;(useGenerateLyrics as jest.Mock).mockReturnValue({
      mutate: mockGenerateLyrics,
      isPending: false,
    })
    
    ;(useRateLimit as jest.Mock).mockReturnValue({
      data: { remaining: 3, reset_time: new Date().toISOString() },
    })
  })

  it('renders button with correct text', () => {
    renderWithRouter(<GenerateButton />)
    
    expect(screen.getByRole('button', { name: /Generate lyrics from content/i })).toBeInTheDocument()
    expect(screen.getByText('Generate Lyrics')).toBeInTheDocument()
  })

  it('shows keyboard shortcut hint', () => {
    renderWithRouter(<GenerateButton />)
    
    expect(screen.getByText(/Ctrl\+Enter/i)).toBeInTheDocument()
  })

  it('is disabled when content is empty', () => {
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      content: '',
      isGenerating: false,
      setGenerating: mockSetGenerating,
      searchEnabled: false,
    })
    
    renderWithRouter(<GenerateButton />)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('is disabled when content exceeds 10000 words', () => {
    const longContent = 'word '.repeat(10001).trim()
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      content: longContent,
      isGenerating: false,
      setGenerating: mockSetGenerating,
      searchEnabled: false,
    })
    
    renderWithRouter(<GenerateButton />)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('is disabled when rate limit is reached', () => {
    ;(useRateLimit as jest.Mock).mockReturnValue({
      data: { remaining: 0, reset_time: new Date().toISOString() },
    })
    
    renderWithRouter(<GenerateButton />)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('is disabled when already generating', () => {
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      content: 'Test content',
      isGenerating: true,
      setGenerating: mockSetGenerating,
      searchEnabled: false,
    })
    
    renderWithRouter(<GenerateButton />)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('is disabled when mutation is pending', () => {
    ;(useGenerateLyrics as jest.Mock).mockReturnValue({
      mutate: mockGenerateLyrics,
      isPending: true,
    })
    
    renderWithRouter(<GenerateButton />)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('shows loading state when generating', () => {
    ;(useGenerateLyrics as jest.Mock).mockReturnValue({
      mutate: mockGenerateLyrics,
      isPending: true,
    })
    
    renderWithRouter(<GenerateButton />)
    
    expect(screen.getByText('Generating Lyrics...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('calls generateLyrics when clicked', async () => {
    const user = userEvent.setup()
    renderWithRouter(<GenerateButton />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(mockGenerateLyrics).toHaveBeenCalledWith({
      content: 'Test content',
      search_enabled: false,
    })
  })

  it('includes search_enabled flag when search is enabled', async () => {
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      content: 'Test content',
      isGenerating: false,
      setGenerating: mockSetGenerating,
      searchEnabled: true,
    })
    
    const user = userEvent.setup()
    renderWithRouter(<GenerateButton />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(mockGenerateLyrics).toHaveBeenCalledWith({
      content: 'Test content',
      search_enabled: true,
    })
  })

  it('triggers generation on Ctrl+Enter', () => {
    renderWithRouter(<GenerateButton />)
    
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true })
    
    expect(mockGenerateLyrics).toHaveBeenCalledWith({
      content: 'Test content',
      search_enabled: false,
    })
  })

  it('triggers generation on Meta+Enter (Mac)', () => {
    renderWithRouter(<GenerateButton />)
    
    fireEvent.keyDown(window, { key: 'Enter', metaKey: true })
    
    expect(mockGenerateLyrics).toHaveBeenCalledWith({
      content: 'Test content',
      search_enabled: false,
    })
  })

  it('does not trigger on Ctrl+Enter when disabled', () => {
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      content: '',
      isGenerating: false,
      setGenerating: mockSetGenerating,
      searchEnabled: false,
    })
    
    renderWithRouter(<GenerateButton />)
    
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true })
    
    expect(mockGenerateLyrics).not.toHaveBeenCalled()
  })

  it('syncs generating state with isPending', () => {
    const { rerender } = renderWithRouter(<GenerateButton />)
    
    expect(mockSetGenerating).toHaveBeenCalledWith(false)
    
    ;(useGenerateLyrics as jest.Mock).mockReturnValue({
      mutate: mockGenerateLyrics,
      isPending: true,
    })
    
    rerender(<MemoryRouter><GenerateButton /></MemoryRouter>)
    
    expect(mockSetGenerating).toHaveBeenCalledWith(true)
  })
})
