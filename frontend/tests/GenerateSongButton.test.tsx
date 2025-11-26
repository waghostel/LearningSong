import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GenerateSongButton } from '@/components/GenerateSongButton'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'

// Mock the store
jest.mock('@/stores/lyricsEditingStore')

describe('GenerateSongButton Component', () => {
  const mockOnClick = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock: valid state with lyrics
    ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
      editedLyrics: 'Test lyrics content',
      isGenerating: false,
    })
  })

  describe('Disabled States', () => {
    it('is disabled when lyrics are empty', () => {
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        editedLyrics: '',
        isGenerating: false,
      })
      
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(screen.getByText(/Please enter lyrics/i)).toBeInTheDocument()
    })

    it('is disabled when lyrics contain only whitespace', () => {
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        editedLyrics: '   \n\t  ',
        isGenerating: false,
      })
      
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('is disabled when lyrics exceed 3000 characters', () => {
      const longLyrics = 'a'.repeat(3001)
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        editedLyrics: longLyrics,
        isGenerating: false,
      })
      
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(screen.getByText(/exceed maximum length/i)).toBeInTheDocument()
    })

    it('is disabled when rate limit is reached', () => {
      render(<GenerateSongButton onClick={mockOnClick} isRateLimited={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(screen.getByText(/Rate limit reached/i)).toBeInTheDocument()
    })

    it('is disabled when already generating', () => {
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        editedLyrics: 'Test lyrics',
        isGenerating: true,
      })
      
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('is disabled when offline', () => {
      render(<GenerateSongButton onClick={mockOnClick} isOffline={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(screen.getByText(/You are offline/i)).toBeInTheDocument()
    })

    it('is enabled when all conditions are met', () => {
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })
  })

  describe('Keyboard Shortcut', () => {
    it('triggers onClick on Ctrl+Enter when enabled', () => {
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true })
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('triggers onClick on Meta+Enter (Mac) when enabled', () => {
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      fireEvent.keyDown(window, { key: 'Enter', metaKey: true })
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('does not trigger onClick on Ctrl+Enter when disabled', () => {
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        editedLyrics: '',
        isGenerating: false,
      })
      
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true })
      
      expect(mockOnClick).not.toHaveBeenCalled()
    })

    it('does not trigger onClick on regular Enter key', () => {
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      fireEvent.keyDown(window, { key: 'Enter' })
      
      expect(mockOnClick).not.toHaveBeenCalled()
    })

    it('shows keyboard shortcut hint', () => {
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      expect(screen.getByText(/Ctrl\+Enter/i)).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when generating', () => {
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        editedLyrics: 'Test lyrics',
        isGenerating: true,
      })
      
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      expect(screen.getByText('Generating Song...')).toBeInTheDocument()
    })

    it('has aria-busy attribute when generating', () => {
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        editedLyrics: 'Test lyrics',
        isGenerating: true,
      })
      
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
    })

    it('shows progress message when generating', () => {
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        editedLyrics: 'Test lyrics',
        isGenerating: true,
      })
      
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      expect(screen.getByText(/Song generation in progress/i)).toBeInTheDocument()
    })

    it('shows normal button text when not generating', () => {
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      expect(screen.getByText('Generate Song')).toBeInTheDocument()
    })
  })

  describe('Click Behavior', () => {
    it('calls onClick when button is clicked', async () => {
      const user = userEvent.setup()
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when button is disabled', async () => {
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        editedLyrics: '',
        isGenerating: false,
      })
      
      const user = userEvent.setup()
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(mockOnClick).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper aria-label when enabled', () => {
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Generate song from lyrics'))
    })

    it('has proper aria-label when disabled', () => {
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        editedLyrics: '',
        isGenerating: false,
      })
      
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('disabled'))
    })

    it('has aria-describedby pointing to description', () => {
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-describedby', 'generate-song-description')
    })

    it('shows estimated time when enabled', () => {
      render(<GenerateSongButton onClick={mockOnClick} />)
      
      expect(screen.getByText(/30-60 seconds/i)).toBeInTheDocument()
    })
  })
})
