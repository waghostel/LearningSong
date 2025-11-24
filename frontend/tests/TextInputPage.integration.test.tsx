import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TextInputPage } from '@/pages/TextInputPage'
import { useAuth } from '@/hooks/useAuth'
import * as lyricsApi from '@/api/lyrics'

// Mock dependencies
jest.mock('@/hooks/useAuth')
jest.mock('@/api/lyrics')

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockedGenerateLyrics = lyricsApi.generateLyrics as jest.MockedFunction<typeof lyricsApi.generateLyrics>
const mockedGetRateLimit = lyricsApi.getRateLimit as jest.MockedFunction<typeof lyricsApi.getRateLimit>

// Helper to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('TextInputPage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    
    // Default auth state
    mockedUseAuth.mockReturnValue({
      userId: 'test-user-123',
      loading: false,
      error: null,
    })
    
    // Default rate limit
    mockedGetRateLimit.mockResolvedValue({
      remaining: 3,
      reset_time: new Date(Date.now() + 86400000).toISOString(),
    })
  })

  describe('Authentication Flow', () => {
    it('shows loading state while authenticating', () => {
      mockedUseAuth.mockReturnValue({
        userId: null,
        loading: true,
        error: null,
      })
      
      renderWithProviders(<TextInputPage />)
      
      expect(screen.getByText('Authenticating...')).toBeInTheDocument()
    })

    it('shows error state when authentication fails', () => {
      mockedUseAuth.mockReturnValue({
        userId: null,
        loading: false,
        error: new Error('Auth failed'),
      })
      
      renderWithProviders(<TextInputPage />)
      
      expect(screen.getByText('Authentication Error')).toBeInTheDocument()
      expect(screen.getByText(/Auth failed/i)).toBeInTheDocument()
    })

    it('renders page when authenticated', async () => {
      renderWithProviders(<TextInputPage />)
      
      await waitFor(() => {
        expect(screen.getByText('LearningSong')).toBeInTheDocument()
        expect(screen.getByText('Create Your Learning Song')).toBeInTheDocument()
      })
    })
  })

  describe('Complete User Flow', () => {
    it('allows user to input content and generate lyrics', async () => {
      const user = userEvent.setup()
      
      mockedGenerateLyrics.mockResolvedValue({
        lyrics: 'Generated test lyrics',
        content_hash: 'hash123',
        cached: false,
        processing_time: 15.5,
      })
      
      renderWithProviders(<TextInputPage />)
      
      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })
      
      // Input content
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Educational content about science')
      
      // Click generate button
      const generateButton = screen.getByRole('button', { name: /Generate lyrics/i })
      await user.click(generateButton)
      
      // Verify API was called
      await waitFor(() => {
        expect(mockedGenerateLyrics).toHaveBeenCalledWith({
          content: 'Educational content about science',
          search_enabled: false,
        })
      })
    })

    it('enables search grounding when toggle is activated', async () => {
      const user = userEvent.setup()
      
      mockedGenerateLyrics.mockResolvedValue({
        lyrics: 'Enriched lyrics',
        content_hash: 'hash456',
        cached: false,
        processing_time: 25.3,
      })
      
      renderWithProviders(<TextInputPage />)
      
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })
      
      // Input content
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Short content')
      
      // Enable search toggle
      const searchToggle = screen.getByRole('switch', { name: /Toggle Google Search/i })
      await user.click(searchToggle)
      
      // Generate
      const generateButton = screen.getByRole('button', { name: /Generate lyrics/i })
      await user.click(generateButton)
      
      // Verify search was enabled
      await waitFor(() => {
        expect(mockedGenerateLyrics).toHaveBeenCalledWith({
          content: 'Short content',
          search_enabled: true,
        })
      })
    })

    it('uses keyboard shortcut to generate', async () => {
      const user = userEvent.setup()
      
      mockedGenerateLyrics.mockResolvedValue({
        lyrics: 'Keyboard shortcut lyrics',
        content_hash: 'hash789',
        cached: false,
        processing_time: 12.1,
      })
      
      renderWithProviders(<TextInputPage />)
      
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })
      
      // Input content
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Test content for shortcut')
      
      // Use keyboard shortcut
      await user.keyboard('{Control>}{Enter}{/Control}')
      
      // Verify API was called
      await waitFor(() => {
        expect(mockedGenerateLyrics).toHaveBeenCalled()
      })
    })
  })

  describe('Error Scenarios', () => {
    it('prevents generation with empty content', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<TextInputPage />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate lyrics/i })).toBeInTheDocument()
      })
      
      const generateButton = screen.getByRole('button', { name: /Generate lyrics/i })
      expect(generateButton).toBeDisabled()
      
      await user.click(generateButton)
      
      expect(mockedGenerateLyrics).not.toHaveBeenCalled()
    })

    it('prevents generation when content exceeds 10000 words', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(<TextInputPage />)
      
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })
      
      // Input too much content
      const longContent = 'word '.repeat(10001).trim()
      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, longContent)
      
      // Button should be disabled
      const generateButton = screen.getByRole('button', { name: /Generate lyrics/i })
      expect(generateButton).toBeDisabled()
      
      // Verify error message
      expect(screen.getByText(/Content exceeds limit/i)).toBeInTheDocument()
    })

    it('prevents generation when rate limit is reached', async () => {
      mockedGetRateLimit.mockResolvedValue({
        remaining: 0,
        reset_time: new Date(Date.now() + 3600000).toISOString(),
      })
      
      const user = userEvent.setup()
      
      renderWithProviders(<TextInputPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/0\/3 songs remaining/i)).toBeInTheDocument()
      })
      
      // Input content
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Test content')
      
      // Button should be disabled
      const generateButton = screen.getByRole('button', { name: /Generate lyrics/i })
      expect(generateButton).toBeDisabled()
    })

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup()
      
      mockedGenerateLyrics.mockRejectedValue(new Error('Network Error'))
      
      renderWithProviders(<TextInputPage />)
      
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })
      
      // Input content
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Test content')
      
      // Generate
      const generateButton = screen.getByRole('button', { name: /Generate lyrics/i })
      await user.click(generateButton)
      
      // Error should be handled (not crash the app)
      await waitFor(() => {
        expect(mockedGenerateLyrics).toHaveBeenCalled()
      })
    })
  })

  describe('Rate Limit Display', () => {
    it('shows correct rate limit status', async () => {
      mockedGetRateLimit.mockResolvedValue({
        remaining: 2,
        reset_time: new Date(Date.now() + 86400000).toISOString(),
      })
      
      renderWithProviders(<TextInputPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/2\/3 songs remaining/i)).toBeInTheDocument()
      })
    })

    it('shows countdown when limit is reached', async () => {
      mockedGetRateLimit.mockResolvedValue({
        remaining: 0,
        reset_time: new Date(Date.now() + 3600000).toISOString(),
      })
      
      renderWithProviders(<TextInputPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/0\/3 songs remaining/i)).toBeInTheDocument()
        expect(screen.getByText(/Resets in:/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has skip to main content link', async () => {
      renderWithProviders(<TextInputPage />)
      
      await waitFor(() => {
        const skipLink = screen.getByText('Skip to main content')
        expect(skipLink).toBeInTheDocument()
        expect(skipLink).toHaveAttribute('href', '#main-content')
      })
    })

    it('has proper heading hierarchy', async () => {
      renderWithProviders(<TextInputPage />)
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'LearningSong' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { level: 2, name: 'Create Your Learning Song' })).toBeInTheDocument()
      })
    })

    it('has proper ARIA labels', async () => {
      renderWithProviders(<TextInputPage />)
      
      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument()
        expect(screen.getByRole('main')).toBeInTheDocument()
        expect(screen.getByRole('contentinfo')).toBeInTheDocument()
      })
    })
  })
})
