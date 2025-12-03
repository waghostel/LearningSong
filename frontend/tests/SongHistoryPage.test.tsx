import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SongHistoryPage } from '@/pages/SongHistoryPage'
import { useAuth } from '@/hooks/useAuth'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import * as songsApi from '@/api/songs'
import { MusicStyle } from '@/api/songs'

// Mock dependencies
jest.mock('@/hooks/useAuth')
jest.mock('@/hooks/useNetworkStatus')
jest.mock('@/api/songs')

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockedUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>
const mockedGetSongHistory = songsApi.getSongHistory as jest.MockedFunction<typeof songsApi.getSongHistory>

// Helper to render with providers
const renderWithProviders = (initialPath: string = '/history') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/history" element={<SongHistoryPage />} />
          <Route path="/playback/:songId" element={<div>Playback Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// Sample song history data
const mockSongHistory = [
  {
    song_id: 'song-1',
    style: MusicStyle.POP,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    expires_at: new Date(Date.now() + 46 * 60 * 60 * 1000).toISOString(), // 46 hours from now
    lyrics_preview: 'This is a pop song about learning biology...',
    has_variations: true,
    primary_variation_index: 0,
  },
  {
    song_id: 'song-2',
    style: MusicStyle.ROCK,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    expires_at: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(), // 36 hours from now
    lyrics_preview: 'Rock and roll history lesson...',
    has_variations: false,
    primary_variation_index: 0,
  },
]

describe('SongHistoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockedUseAuth.mockReturnValue({
      userId: 'user-123',
      loading: false,
      error: null,
    })

    mockedUseNetworkStatus.mockReturnValue({
      isOnline: true,
      wasOffline: false,
      lastOnlineAt: new Date(),
      lastOfflineAt: null,
      checkConnection: jest.fn(),
    })
  })

  describe('Loading State', () => {
    it('should display loading state while fetching songs', async () => {
      mockedGetSongHistory.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSongHistory), 100))
      )

      renderWithProviders()

      // Should show loading indicator
      expect(screen.getByText('Loading your songs...')).toBeInTheDocument()

      // Should eventually load songs
      await waitFor(() => {
        expect(screen.queryByText('Loading your songs...')).not.toBeInTheDocument()
      })
    })

    it('should display auth loading state', () => {
      mockedUseAuth.mockReturnValue({
        userId: null,
        loading: true,
        error: null,
      })

      renderWithProviders()

      expect(screen.getByText('Authenticating...')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no songs exist', async () => {
      mockedGetSongHistory.mockResolvedValue([])

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText('No songs yet')).toBeInTheDocument()
        expect(
          screen.getByText(/Create your first learning song/i)
        ).toBeInTheDocument()
      })
    })

    it('should have a button to create a song in empty state', async () => {
      mockedGetSongHistory.mockResolvedValue([])

      renderWithProviders()

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /Create a Song/i })
        expect(createButton).toBeInTheDocument()
      })
    })
  })

  describe('List Rendering', () => {
    it('should render list of songs when data is available', async () => {
      mockedGetSongHistory.mockResolvedValue(mockSongHistory)

      renderWithProviders()

      await waitFor(() => {
        // Check for song content
        expect(screen.getByText(/This is a pop song about learning biology/i)).toBeInTheDocument()
        expect(screen.getByText(/Rock and roll history lesson/i)).toBeInTheDocument()
      })
    })

    it('should display song style badges', async () => {
      mockedGetSongHistory.mockResolvedValue(mockSongHistory)

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText('Pop')).toBeInTheDocument()
        expect(screen.getByText('Rock')).toBeInTheDocument()
      })
    })

    it('should display variation count for songs with multiple versions', async () => {
      mockedGetSongHistory.mockResolvedValue(mockSongHistory)

      renderWithProviders()

      await waitFor(() => {
        const variationBadges = screen.getAllByText('2 versions')
        expect(variationBadges.length).toBeGreaterThan(0)
      })
    })

    it('should display creation date and expiration for each song', async () => {
      mockedGetSongHistory.mockResolvedValue(mockSongHistory)

      renderWithProviders()

      await waitFor(() => {
        // Verify songs are rendered
        expect(screen.getByText(/This is a pop song about learning biology/i)).toBeInTheDocument()
        expect(screen.getByText(/Rock and roll history lesson/i)).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate to playback page when song is clicked', async () => {
      mockedGetSongHistory.mockResolvedValue(mockSongHistory)

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText(/This is a pop song about learning biology/i)).toBeInTheDocument()
      })

      // Click on first song
      const songButton = screen.getByRole('button', {
        name: /Play Pop song/i,
      })
      await userEvent.click(songButton)

      // Should navigate to playback page
      await waitFor(() => {
        expect(screen.getByText('Playback Page')).toBeInTheDocument()
      })
    })

    it('should navigate to home when back button is clicked', async () => {
      mockedGetSongHistory.mockResolvedValue(mockSongHistory)

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText(/This is a pop song about learning biology/i)).toBeInTheDocument()
      })

      // Click back button
      const backButton = screen.getByRole('button', { name: /Go back to home page/i })
      await userEvent.click(backButton)

      // Should navigate to home
      await waitFor(() => {
        expect(screen.getByText('Home Page')).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation to songs', async () => {
      mockedGetSongHistory.mockResolvedValue(mockSongHistory)

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText(/This is a pop song about learning biology/i)).toBeInTheDocument()
      })

      // Get first song button
      const songButton = screen.getByRole('button', {
        name: /Play Pop song/i,
      })

      // Focus and press Enter
      songButton.focus()
      await userEvent.keyboard('{Enter}')

      // Should navigate to playback page
      await waitFor(() => {
        expect(screen.getByText('Playback Page')).toBeInTheDocument()
      })
    })
  })

  describe('Error State', () => {
    it('should display error message when fetch fails', async () => {
      const errorMessage = 'Failed to load songs'
      mockedGetSongHistory.mockRejectedValue(new Error(errorMessage))

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Songs')).toBeInTheDocument()
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('should have a retry button in error state', async () => {
      mockedGetSongHistory.mockRejectedValue(new Error('Network error'))

      renderWithProviders()

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /Try Again/i })
        expect(retryButton).toBeInTheDocument()
      })
    })

    it('should disable song items when offline', async () => {
      mockedGetSongHistory.mockResolvedValue(mockSongHistory)
      mockedUseNetworkStatus.mockReturnValue({
        isOnline: false,
        wasOffline: true,
        lastOnlineAt: new Date(Date.now() - 60000),
        lastOfflineAt: new Date(),
        checkConnection: jest.fn(),
      })

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByText(/This is a pop song about learning biology/i)).toBeInTheDocument()
      })

      // Song buttons should be disabled
      const songButtons = screen.getAllByRole('button', { name: /Play/i })
      songButtons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      mockedGetSongHistory.mockResolvedValue(mockSongHistory)

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument() // LearningSong
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument() // My Songs
      })
    })

    it('should have skip to main content link', () => {
      mockedGetSongHistory.mockResolvedValue([])

      renderWithProviders()

      const skipLink = screen.getByText('Skip to main content')
      expect(skipLink).toBeInTheDocument()
      expect(skipLink).toHaveClass('sr-only')
    })

    it('should have proper ARIA labels on buttons', async () => {
      mockedGetSongHistory.mockResolvedValue(mockSongHistory)

      renderWithProviders()

      await waitFor(() => {
        const songButtons = screen.getAllByRole('button', { name: /Play/i })
        songButtons.forEach(button => {
          expect(button).toHaveAttribute('aria-label')
        })
      })
    })

    it('should have proper role attributes on main sections', async () => {
      mockedGetSongHistory.mockResolvedValue(mockSongHistory)

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument()
        expect(screen.getByRole('banner')).toBeInTheDocument()
        expect(screen.getByRole('contentinfo')).toBeInTheDocument()
      })
    })
  })
})
