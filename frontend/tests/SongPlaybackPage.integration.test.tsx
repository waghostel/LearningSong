import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SongPlaybackPage, mapErrorToUserFriendly } from '@/pages/SongPlaybackPage'
import { useAuth } from '@/hooks/useAuth'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useSongPlaybackStore } from '@/stores/songPlaybackStore'
import { MusicStyle } from '@/api/songs'

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn()

// Mock dependencies
jest.mock('@/hooks/useAuth')
jest.mock('@/hooks/useNetworkStatus')

// Mock the store's loadSong and loadSharedSong to prevent API calls
const originalLoadSong = useSongPlaybackStore.getState().loadSong
const originalLoadSharedSong = useSongPlaybackStore.getState().loadSharedSong

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockedUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>

// Helper to render with providers
const renderWithProviders = (initialPath: string = '/playback/song-123') => {
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
          <Route path="/lyrics-edit" element={<div>Lyrics Edit Page</div>} />
          <Route path="/playback/:songId" element={<SongPlaybackPage />} />
          <Route path="/shared/:shareToken" element={<SongPlaybackPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// Sample song data
const mockSongData = {
  songId: 'song-123',
  songUrl: 'https://example.com/song.mp3',
  lyrics: 'Verse 1\nThis is the first verse\n\nChorus\nThis is the chorus',
  style: MusicStyle.POP,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  isOwner: true,
  isLoading: false,
  error: null as string | null,
}

describe('SongPlaybackPage Integration Tests', () => {
  const mockCheckConnection = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    sessionStorage.clear()
    
    // Reset Zustand store to initial state
    useSongPlaybackStore.setState({
      songId: null,
      songUrl: null,
      lyrics: '',
      style: null,
      createdAt: null,
      expiresAt: null,
      isOwner: false,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isLoading: false,
      error: null,
      shareUrl: null,
      isSharing: false,
      // Mock loadSong and loadSharedSong to be no-ops (state is set manually in tests)
      loadSong: jest.fn().mockResolvedValue(undefined),
      loadSharedSong: jest.fn().mockResolvedValue(undefined),
    })
    
    // Default auth state
    mockedUseAuth.mockReturnValue({
      userId: 'test-user-123',
      loading: false,
      error: null,
    })
    
    // Default network status
    mockedUseNetworkStatus.mockReturnValue({
      isOnline: true,
      wasOffline: false,
      lastOnlineAt: null,
      lastOfflineAt: null,
      checkConnection: mockCheckConnection,
    })
  })
  
  afterAll(() => {
    // Restore original functions
    useSongPlaybackStore.setState({
      loadSong: originalLoadSong,
      loadSharedSong: originalLoadSharedSong,
    })
  })

  // Helper to set up store with song data before render
  const setupStoreWithSong = (overrides = {}) => {
    useSongPlaybackStore.setState({
      ...mockSongData,
      ...overrides,
    })
  }

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      useSongPlaybackStore.setState({ isLoading: true })
      
      renderWithProviders('/playback/song-123')

      expect(screen.getByText('Loading song...')).toBeInTheDocument()
    })

    it('shows auth loading state', () => {
      mockedUseAuth.mockReturnValue({
        userId: null,
        loading: true,
        error: null,
      })
      
      renderWithProviders('/playback/song-123')

      expect(screen.getByText('Authenticating...')).toBeInTheDocument()
    })
  })

  describe('Song Display', () => {
    it('renders song playback page with all components when song is loaded', async () => {
      setupStoreWithSong()
      
      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByText('LearningSong')).toBeInTheDocument()
        expect(screen.getByText('Your song is ready to play')).toBeInTheDocument()
      })

      // Audio player should be present (use getAllBy since there's a section and inner div)
      const audioPlayers = screen.getAllByRole('region', { name: /audio player/i })
      expect(audioPlayers.length).toBeGreaterThan(0)

      // Lyrics should be displayed
      expect(screen.getByText('Lyrics')).toBeInTheDocument()

      // Share button should be present for owner
      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()

      // Regenerate button should be present
      expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument()
    })

    it('displays song metadata correctly', async () => {
      setupStoreWithSong()
      
      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByTestId('style-badge')).toHaveTextContent('Pop')
      })
    })

    it('hides share button for non-owners', async () => {
      setupStoreWithSong({ isOwner: false })

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByText('LearningSong')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()
    })
  })

  describe('Expired Song Handling', () => {
    it('shows expiration notice for expired songs', async () => {
      setupStoreWithSong({
        expiresAt: new Date(Date.now() - 1000), // Already expired
      })

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByTestId('expired-notice')).toBeInTheDocument()
      })
    })

    it('disables audio player for expired songs', async () => {
      setupStoreWithSong({
        expiresAt: new Date(Date.now() - 1000),
      })

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        // Get all audio player regions and check if any has the disabled class
        const audioPlayers = screen.getAllByRole('region', { name: /audio player/i })
        const hasDisabledPlayer = audioPlayers.some(player => player.classList.contains('opacity-50'))
        expect(hasDisabledPlayer).toBe(true)
      })
    })

    it('hides regenerate button for expired songs', async () => {
      setupStoreWithSong({
        expiresAt: new Date(Date.now() - 1000),
      })

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByTestId('expired-notice')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument()
    })
  })

  describe('Regenerate Flow', () => {
    it('shows confirmation dialog when regenerate is clicked', async () => {
      const user = userEvent.setup()
      setupStoreWithSong()

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /regenerate/i }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Regenerate Song?')).toBeInTheDocument()
    })

    it('navigates to lyrics edit page on confirm', async () => {
      const user = userEvent.setup()
      setupStoreWithSong()

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /regenerate/i }))
      await user.click(screen.getByRole('button', { name: /continue/i }))

      await waitFor(() => {
        expect(screen.getByText('Lyrics Edit Page')).toBeInTheDocument()
      })
    })

    it('closes dialog on cancel', async () => {
      const user = userEvent.setup()
      setupStoreWithSong()

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /regenerate/i }))
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Offline Handling', () => {
    it('shows offline indicator when network is unavailable', async () => {
      mockedUseNetworkStatus.mockReturnValue({
        isOnline: false,
        wasOffline: true,
        lastOnlineAt: null,
        lastOfflineAt: new Date(),
        checkConnection: mockCheckConnection,
      })
      setupStoreWithSong()

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByText("You're Offline")).toBeInTheDocument()
      })
    })

    it('disables share button when offline', async () => {
      mockedUseNetworkStatus.mockReturnValue({
        isOnline: false,
        wasOffline: true,
        lastOnlineAt: null,
        lastOfflineAt: new Date(),
        checkConnection: mockCheckConnection,
      })
      setupStoreWithSong()

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        const shareButton = screen.getByRole('button', { name: /share/i })
        expect(shareButton).toBeDisabled()
      })
    })

    it('disables regenerate button when offline', async () => {
      mockedUseNetworkStatus.mockReturnValue({
        isOnline: false,
        wasOffline: true,
        lastOnlineAt: null,
        lastOfflineAt: new Date(),
        checkConnection: mockCheckConnection,
      })
      setupStoreWithSong()

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        const regenerateButton = screen.getByRole('button', { name: /regenerate/i })
        expect(regenerateButton).toBeDisabled()
      })
    })
  })

  describe('Error Scenarios', () => {
    it('shows error state when error is set', async () => {
      setupStoreWithSong({
        songUrl: null,
        error: 'Some error',
      })

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Song')).toBeInTheDocument()
      })
    })

    it('provides retry and home buttons on error', async () => {
      setupStoreWithSong({
        songUrl: null,
        error: 'Network error',
      })

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('navigates to home when back button is clicked', async () => {
      const user = userEvent.setup()
      setupStoreWithSong()

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to home/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /back to home/i }))

      await waitFor(() => {
        expect(screen.getByText('Home Page')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has skip to main content link', async () => {
      setupStoreWithSong()
      
      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        const skipLink = screen.getByText('Skip to main content')
        expect(skipLink).toBeInTheDocument()
        expect(skipLink).toHaveAttribute('href', '#main-content')
      })
    })

    it('has proper heading hierarchy', async () => {
      setupStoreWithSong()
      
      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'LearningSong' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { level: 2, name: 'Lyrics' })).toBeInTheDocument()
      })
    })

    it('has proper ARIA landmarks', async () => {
      setupStoreWithSong()
      
      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByRole('banner')).toBeInTheDocument()
        expect(screen.getByRole('main')).toBeInTheDocument()
        expect(screen.getByRole('contentinfo')).toBeInTheDocument()
      })
    })
  })

  describe('Error Message Mapping', () => {
    it('maps 404 errors to user-friendly message', () => {
      expect(mapErrorToUserFriendly('404 Not Found')).toContain('could not be found')
    })

    it('maps 410 errors to user-friendly message', () => {
      expect(mapErrorToUserFriendly('410 Gone')).toContain('expired')
    })

    it('maps 403 errors to user-friendly message', () => {
      expect(mapErrorToUserFriendly('403 Forbidden')).toContain('permission')
    })

    it('maps network errors to user-friendly message', () => {
      expect(mapErrorToUserFriendly('Network error')).toContain('connect')
    })
  })

  describe('Song Switcher Integration', () => {
    it('displays song switcher when song has 2 variations', async () => {
      const mockVariations = [
        {
          audio_url: 'https://example.com/song1.mp3',
          audio_id: 'audio-id-1',
          variation_index: 0,
        },
        {
          audio_url: 'https://example.com/song2.mp3',
          audio_id: 'audio-id-2',
          variation_index: 1,
        },
      ]

      setupStoreWithSong({
        songVariations: mockVariations,
        primaryVariationIndex: 0,
      })

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByTestId('song-switcher')).toBeInTheDocument()
      })

      // Should show both version buttons
      expect(screen.getByLabelText(/Version 1/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Version 2/)).toBeInTheDocument()
    })

    it('hides song switcher when song has only 1 variation', async () => {
      const mockVariations = [
        {
          audio_url: 'https://example.com/song1.mp3',
          audio_id: 'audio-id-1',
          variation_index: 0,
        },
      ]

      setupStoreWithSong({
        songVariations: mockVariations,
        primaryVariationIndex: 0,
      })

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByText('LearningSong')).toBeInTheDocument()
      })

      // Song switcher should not be present
      expect(screen.queryByTestId('song-switcher')).not.toBeInTheDocument()
    })

    it('positions song switcher near audio player', async () => {
      const mockVariations = [
        {
          audio_url: 'https://example.com/song1.mp3',
          audio_id: 'audio-id-1',
          variation_index: 0,
        },
        {
          audio_url: 'https://example.com/song2.mp3',
          audio_id: 'audio-id-2',
          variation_index: 1,
        },
      ]

      setupStoreWithSong({
        songVariations: mockVariations,
        primaryVariationIndex: 0,
      })

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        const audioPlayer = screen.getAllByRole('region', { name: /audio player/i })[0]
        const songSwitcher = screen.getByTestId('song-switcher')

        // Both should be in the same section
        const audioPlayerSection = audioPlayer.closest('section')
        expect(audioPlayerSection).toContainElement(songSwitcher)
      })
    })

    it('disables song switcher when song is expired', async () => {
      const mockVariations = [
        {
          audio_url: 'https://example.com/song1.mp3',
          audio_id: 'audio-id-1',
          variation_index: 0,
        },
        {
          audio_url: 'https://example.com/song2.mp3',
          audio_id: 'audio-id-2',
          variation_index: 1,
        },
      ]

      setupStoreWithSong({
        songVariations: mockVariations,
        primaryVariationIndex: 0,
        expiresAt: new Date(Date.now() - 1000), // Already expired
      })

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        const version1Button = screen.getByLabelText(/Version 1/)
        expect(version1Button).toBeDisabled()
      })
    })

    it('shows active variation indication', async () => {
      const mockVariations = [
        {
          audio_url: 'https://example.com/song1.mp3',
          audio_id: 'audio-id-1',
          variation_index: 0,
        },
        {
          audio_url: 'https://example.com/song2.mp3',
          audio_id: 'audio-id-2',
          variation_index: 1,
        },
      ]

      setupStoreWithSong({
        songVariations: mockVariations,
        primaryVariationIndex: 0,
      })

      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByText('Currently playing Version 1')).toBeInTheDocument()
      })
    })
  })
})
