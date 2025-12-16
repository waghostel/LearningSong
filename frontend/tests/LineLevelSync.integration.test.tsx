/**
 * Integration tests for line-level synchronization and click navigation
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
import { saveSyncMode, loadSyncMode } from '@/lib/sync-mode-storage'

jest.mock('@/hooks/useAuth')
jest.mock('@/hooks/useNetworkStatus')

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockedUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>

jest.mock('@/hooks/useLyrics', () => ({
  useRateLimit: () => ({
    data: { remaining: 3, total_limit: 3, reset_time: Date.now() + 10000 },
    isLoading: false,
    error: null
  }),
  useGenerateLyrics: () => ({ mutate: jest.fn() }),
}))

jest.mock('@/hooks/useSongSwitcher', () => ({
  useSongSwitcher: () => ({
    activeIndex: 0,
    isLoading: false,
    error: null,
    switchVariation: jest.fn(),
    clearError: jest.fn(),
  }),
}))

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

const mockSongWithLines = {
  songId: 'song-123',
  songUrl: 'https://example.com/song.mp3',
  lyrics: 'First line of lyrics\nSecond line of lyrics\nThird line of lyrics',
  style: MusicStyle.POP,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  isOwner: true,
  isLoading: false,
  error: null,
  alignedWords: [
    { word: 'First', startS: 1.0, endS: 1.2, success: true, palign: 1.0 },
    { word: 'line', startS: 1.2, endS: 1.4, success: true, palign: 1.0 },
    { word: 'of', startS: 1.4, endS: 1.5, success: true, palign: 1.0 },
    { word: 'lyrics', startS: 1.5, endS: 1.8, success: true, palign: 1.0 },
    { word: 'Second', startS: 2.0, endS: 2.2, success: true, palign: 1.0 },
    { word: 'line', startS: 2.2, endS: 2.4, success: true, palign: 1.0 },
    { word: 'of', startS: 2.4, endS: 2.5, success: true, palign: 1.0 },
    { word: 'lyrics', startS: 2.5, endS: 2.8, success: true, palign: 1.0 },
    { word: 'Third', startS: 3.0, endS: 3.2, success: true, palign: 1.0 },
    { word: 'line', startS: 3.2, endS: 3.4, success: true, palign: 1.0 },
    { word: 'of', startS: 3.4, endS: 3.5, success: true, palign: 1.0 },
    { word: 'lyrics', startS: 3.5, endS: 3.8, success: true, palign: 1.0 },
  ],
}


describe('Line-Level Sync Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear() // Clear Zustand persist middleware storage
    
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

  it('displays sync mode toggle when line cues are available', async () => {
    useSongPlaybackStore.setState(mockSongWithLines)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/Sync Mode/i)).toBeInTheDocument()
    })
  })

  it('switches between word and line sync modes', async () => {
    const user = userEvent.setup()
    useSongPlaybackStore.setState(mockSongWithLines)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Switch to word-level/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Switch to line-level/i })).toBeInTheDocument()
    })

    // Click line mode button
    const lineButton = screen.getByRole('button', { name: /Switch to line-level/i })
    await user.click(lineButton)

    await waitFor(() => {
      expect(screen.getByText(/Line-by-line/i)).toBeInTheDocument()
    })
  })

  it('persists sync mode preference to localStorage', async () => {
    const user = userEvent.setup()
    useSongPlaybackStore.setState(mockSongWithLines)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/Sync Mode/i)).toBeInTheDocument()
    })

    // Switch to line mode
    const lineButton = screen.getByRole('button', { name: /Switch to line-level/i })
    await user.click(lineButton)

    // Verify saved to localStorage
    await waitFor(() => {
      const saved = loadSyncMode()
      expect(saved).toBe('line')
    })
  })

  it('restores sync mode preference on page load', async () => {
    // Save preference before rendering
    saveSyncMode('line')
    
    useSongPlaybackStore.setState(mockSongWithLines)
    
    renderWithProviders()

    await waitFor(() => {
      const lineButton = screen.getByRole('button', { name: /Switch to line-level/i })
      expect(lineButton).toHaveAttribute('aria-pressed', 'true')
    })
  })

  it('clicking a line makes it interactive', async () => {
    const user = userEvent.setup()
    
    useSongPlaybackStore.setState(mockSongWithLines)
    
    // Switch to line mode
    saveSyncMode('line')
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/First line of lyrics/)).toBeInTheDocument()
    })

    // Click on second line
    const secondLine = screen.getByText(/Second line of lyrics/)
    await user.click(secondLine)

    // Line should be clickable (has role button)
    expect(secondLine).toHaveAttribute('role', 'button')
  })
  it('renders lines in line sync mode during playback', async () => {
    localStorage.setItem("lyrics-sync-mode", "line")
    useSongPlaybackStore.setState({ ...mockSongWithLines, currentTime: 2.3 })
    renderWithProviders()

    await waitFor(() => {
      // Use getAllByText because there is a visible line AND a live region announcing the line
      const secondLines = screen.getAllByText(/Second line of lyrics/)
      const activeLine = secondLines.find(el => el.getAttribute('role') === 'button')
      
      expect(activeLine).toBeInTheDocument()
      expect(activeLine).toHaveAttribute('aria-current', 'time')
      
      const firstLines = screen.getAllByText(/First line of lyrics/)
      const inactiveLine = firstLines.find(el => el.getAttribute('role') === 'button')
      expect(inactiveLine).toBeInTheDocument()
      expect(inactiveLine).not.toHaveAttribute('aria-current')
    })
  })

  it('calls scrollIntoView when lines are rendered in line sync mode', async () => {
    localStorage.setItem("lyrics-sync-mode", "line")
    useSongPlaybackStore.setState({ ...mockSongWithLines, currentTime: 1.5 })
    renderWithProviders()

    await waitFor(() => {
      // Just check that we have at least one valid line element rendered
      const firstLines = screen.getAllByText(/First line of lyrics/)
      expect(firstLines.length).toBeGreaterThan(0)
    })

    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({
        behavior: 'smooth',
        block: 'center'
      }))
    })
  })
})
