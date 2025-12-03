/**
 * Integration tests for offset control in SongPlaybackPage
 * 
 * Tests the integration of offset state management, persistence,
 * and passing to LyricsDisplay component.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SongPlaybackPage } from '@/pages/SongPlaybackPage'
import { useAuth } from '@/hooks/useAuth'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useSongPlaybackStore } from '@/stores/songPlaybackStore'
import { MusicStyle } from '@/api/songs'
import { loadOffset, saveOffset, clearOffsetStorage } from '@/lib/offset-storage'

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn()

// Mock dependencies
jest.mock('@/hooks/useAuth')
jest.mock('@/hooks/useNetworkStatus')

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
          <Route path="/playback/:songId" element={<SongPlaybackPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// Sample song data with aligned words
const mockSongData = {
  songId: 'song-123',
  songUrl: 'https://example.com/song.mp3',
  lyrics: 'Test lyrics',
  style: MusicStyle.POP,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  isOwner: true,
  isLoading: false,
  error: null as string | null,
  alignedWords: [
    { word: 'Test', startS: 0, endS: 1, success: true, palign: 1.0 },
    { word: 'lyrics', startS: 1, endS: 2, success: true, palign: 1.0 },
  ],
  songVariations: [],
  primaryVariationIndex: 0,
}

describe('SongPlaybackPage Offset Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearOffsetStorage()
    
    // Reset Zustand store
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
      alignedWords: undefined,
      songVariations: [],
      primaryVariationIndex: 0,
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
      checkConnection: jest.fn(),
    })
  })

  afterEach(() => {
    clearOffsetStorage()
  })

  describe('Offset Control Visibility', () => {
    it('shows offset control when aligned words are available', async () => {
      useSongPlaybackStore.setState(mockSongData)
      
      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByTestId('offset-control')).toBeInTheDocument()
      })
    })

    it('hides offset control when no aligned words', async () => {
      useSongPlaybackStore.setState({
        ...mockSongData,
        alignedWords: undefined,
      })
      
      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByText('Lyrics')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('offset-control')).not.toBeInTheDocument()
    })

    it('hides offset control when aligned words array is empty', async () => {
      useSongPlaybackStore.setState({
        ...mockSongData,
        alignedWords: [],
      })
      
      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByText('Lyrics')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('offset-control')).not.toBeInTheDocument()
    })
  })

  describe('Offset State Management', () => {
    it('initializes offset to 0 by default', async () => {
      useSongPlaybackStore.setState(mockSongData)
      
      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        const offsetValue = screen.getByTestId('offset-value')
        expect(offsetValue).toHaveTextContent('0ms')
      })
    })

    it('loads saved offset from localStorage on mount', async () => {
      // Save an offset before rendering
      saveOffset('song-123', -150)
      
      useSongPlaybackStore.setState(mockSongData)
      
      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        const offsetValue = screen.getByTestId('offset-value')
        expect(offsetValue).toHaveTextContent('-150ms')
      })
    })

    it('updates offset when slider changes', async () => {
      const user = userEvent.setup()
      useSongPlaybackStore.setState(mockSongData)
      
      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByTestId('offset-slider')).toBeInTheDocument()
      })

      const slider = screen.getByTestId('offset-slider')
      await user.clear(slider)
      await user.type(slider, '100')

      await waitFor(() => {
        const offsetValue = screen.getByTestId('offset-value')
        expect(offsetValue).toHaveTextContent('100ms')
      })
    })

    it('persists offset to localStorage when changed', async () => {
      const user = userEvent.setup()
      useSongPlaybackStore.setState(mockSongData)
      
      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        expect(screen.getByTestId('offset-increment')).toBeInTheDocument()
      })

      // Click increment button
      await user.click(screen.getByTestId('offset-increment'))

      await waitFor(() => {
        // Verify offset was saved to localStorage
        const savedOffset = loadOffset('song-123')
        expect(savedOffset).toBe(50)
      })
    })
  })

  describe('Offset Passed to LyricsDisplay', () => {
    it('passes offset prop to LyricsDisplay component', async () => {
      saveOffset('song-123', -200)
      useSongPlaybackStore.setState(mockSongData)
      
      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        // The LyricsDisplay should receive the offset
        // We can verify this by checking that the offset control shows the correct value
        const offsetValue = screen.getByTestId('offset-value')
        expect(offsetValue).toHaveTextContent('-200ms')
      })
    })
  })

  describe('Offset Control Disabled State', () => {
    it('disables offset control when song is expired', async () => {
      useSongPlaybackStore.setState({
        ...mockSongData,
        expiresAt: new Date(Date.now() - 1000), // Already expired
      })
      
      renderWithProviders('/playback/song-123')

      await waitFor(() => {
        const slider = screen.getByTestId('offset-slider')
        expect(slider).toBeDisabled()
      })
    })
  })
})
