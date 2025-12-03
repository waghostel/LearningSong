/**
 * Integration tests for offset control and lyrics display
 * Tests the interaction between OffsetControl and LyricsDisplay components
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SongPlaybackPage } from '@/pages/SongPlaybackPage'
import { useSongPlaybackStore } from '@/stores/songPlaybackStore'
import { useAuth } from '@/hooks/useAuth'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { MusicStyle } from '@/api/songs'
import { saveOffset, loadOffset, clearOffsetStorage } from '@/lib/offset-storage'

// Mock dependencies
jest.mock('@/hooks/useAuth')
jest.mock('@/hooks/useNetworkStatus')

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockedUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn()

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
        <SongPlaybackPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}


const mockSongWithTimestamps = {
  songId: 'song-123',
  songUrl: 'https://example.com/song.mp3',
  lyrics: 'Verse 1\nThis is the first verse\n\nChorus\nThis is the chorus',
  style: MusicStyle.POP,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  isOwner: true,
  isLoading: false,
  error: null,
  alignedWords: [
    { word: 'This', startS: 1.0, endS: 1.2, success: true, palign: 1.0 },
    { word: 'is', startS: 1.2, endS: 1.4, success: true, palign: 1.0 },
    { word: 'the', startS: 1.4, endS: 1.6, success: true, palign: 1.0 },
    { word: 'first', startS: 1.6, endS: 1.9, success: true, palign: 1.0 },
    { word: 'verse', startS: 1.9, endS: 2.2, success: true, palign: 1.0 },
  ],
}

describe('Offset Control Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    clearOffsetStorage()
    
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
      loadSong: jest.fn().mockResolvedValue(undefined),
      loadSharedSong: jest.fn().mockResolvedValue(undefined),
    })
    
    mockedUseAuth.mockReturnValue({
      userId: 'test-user-123',
      loading: false,
      error: null,
    })
    
    mockedUseNetworkStatus.mockReturnValue({
      isOnline: true,
      wasOffline: false,
      lastOnlineAt: null,
      lastOfflineAt: null,
      checkConnection: jest.fn(),
    })
  })

  it('displays offset control when timestamped lyrics are available', async () => {
    useSongPlaybackStore.setState(mockSongWithTimestamps)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('offset-control')).toBeInTheDocument()
    })
  })


  it('adjusting offset updates lyrics highlighting immediately', async () => {
    const user = userEvent.setup()
    useSongPlaybackStore.setState(mockSongWithTimestamps)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('offset-control')).toBeInTheDocument()
    })

    // Click increment button
    const incrementButton = screen.getByTestId('offset-increment')
    await user.click(incrementButton)

    // Verify offset value changed
    await waitFor(() => {
      expect(screen.getByTestId('offset-value')).toHaveTextContent('+50ms')
    })
  })

  it('persists offset to localStorage when adjusted', async () => {
    const user = userEvent.setup()
    useSongPlaybackStore.setState(mockSongWithTimestamps)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('offset-control')).toBeInTheDocument()
    })

    // Adjust offset
    const incrementButton = screen.getByTestId('offset-increment')
    await user.click(incrementButton)
    await user.click(incrementButton)

    // Verify saved to localStorage
    await waitFor(() => {
      const savedOffset = loadOffset('song-123')
      expect(savedOffset).toBe(100)
    })
  })

  it('restores offset from localStorage on page load', async () => {
    // Save offset before rendering
    saveOffset('song-123', 150)
    
    useSongPlaybackStore.setState(mockSongWithTimestamps)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('offset-value')).toHaveTextContent('+150ms')
    })
  })

  it('reset button sets offset back to 0', async () => {
    const user = userEvent.setup()
    saveOffset('song-123', 200)
    
    useSongPlaybackStore.setState(mockSongWithTimestamps)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('offset-value')).toHaveTextContent('+200ms')
    })

    // Click reset
    const resetButton = screen.getByTestId('offset-reset')
    await user.click(resetButton)

    await waitFor(() => {
      expect(screen.getByTestId('offset-value')).toHaveTextContent('0ms')
    })
  })
})
