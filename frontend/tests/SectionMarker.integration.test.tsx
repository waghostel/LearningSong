/**
 * Integration tests for section marker detection and highlighting skip
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
import { loadMarkerVisibility, saveMarkerVisibility } from '@/components/MarkerVisibilityToggle'

jest.mock('@/hooks/useAuth')
jest.mock('@/hooks/useNetworkStatus')

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockedUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>

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

const mockSongWithMarkers = {
  songId: 'song-123',
  songUrl: 'https://example.com/song.mp3',
  lyrics: '**[Verse 1]**\nFirst line\nSecond line\n**[Chorus]**\nChorus line',
  style: MusicStyle.POP,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  isOwner: true,
  isLoading: false,
  error: null,
  alignedWords: [
    { word: '**[Verse 1]**', startS: 0.5, endS: 1.0, success: true, palign: 1.0 },
    { word: 'First', startS: 1.0, endS: 1.2, success: true, palign: 1.0 },
    { word: 'line', startS: 1.2, endS: 1.5, success: true, palign: 1.0 },
    { word: 'Second', startS: 2.0, endS: 2.2, success: true, palign: 1.0 },
    { word: 'line', startS: 2.2, endS: 2.5, success: true, palign: 1.0 },
    { word: '**[Chorus]**', startS: 3.0, endS: 3.5, success: true, palign: 1.0 },
    { word: 'Chorus', startS: 3.5, endS: 3.8, success: true, palign: 1.0 },
    { word: 'line', startS: 3.8, endS: 4.1, success: true, palign: 1.0 },
  ],
}


describe('Section Marker Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    
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

  it('displays marker visibility toggle when markers are present', async () => {
    useSongPlaybackStore.setState(mockSongWithMarkers)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByLabelText(/Show section markers/i)).toBeInTheDocument()
    })
  })

  it('hides markers when toggle is turned off', async () => {
    const user = userEvent.setup()
    useSongPlaybackStore.setState(mockSongWithMarkers)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/\*\*\[Verse 1\]\*\*/)).toBeInTheDocument()
    })

    // Toggle markers off
    const toggle = screen.getByLabelText(/Show section markers/i)
    await user.click(toggle)

    await waitFor(() => {
      expect(screen.queryByText(/\*\*\[Verse 1\]\*\*/)).not.toBeInTheDocument()
    })
  })

  it('persists marker visibility preference to localStorage', async () => {
    const user = userEvent.setup()
    useSongPlaybackStore.setState(mockSongWithMarkers)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByLabelText(/Show section markers/i)).toBeInTheDocument()
    })

    // Toggle markers off
    const toggle = screen.getByLabelText(/Show section markers/i)
    await user.click(toggle)

    // Verify saved to localStorage
    await waitFor(() => {
      const saved = loadMarkerVisibility()
      expect(saved).toBe(false)
    })
  })

  it('restores marker visibility preference on page load', async () => {
    // Save preference before rendering
    saveMarkerVisibility(false)
    
    useSongPlaybackStore.setState(mockSongWithMarkers)
    
    renderWithProviders()

    await waitFor(() => {
      const toggle = screen.getByLabelText(/Show section markers/i)
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('section markers have distinct styling from regular lyrics', async () => {
    useSongPlaybackStore.setState(mockSongWithMarkers)
    
    renderWithProviders()

    await waitFor(() => {
      const marker = screen.getByText(/\*\*\[Verse 1\]\*\*/)
      const regularLyric = screen.getByText(/First line/)
      
      // Markers should have different styling
      expect(marker.className).not.toBe(regularLyric.className)
    })
  })
})
