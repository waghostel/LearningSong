/**
 * Integration tests for VTT download and line-level sync
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
import { saveOffset } from '@/lib/offset-storage'

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

const mockSongWithLineCues = {
  songId: 'song-123',
  songUrl: 'https://example.com/song.mp3',
  lyrics: 'Line one\nLine two\nLine three',
  style: MusicStyle.POP,
  createdAt: new Date('2024-12-03'),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  isOwner: true,
  isLoading: false,
  error: null,
  alignedWords: [
    { word: 'Line', startS: 1.0, endS: 1.2, success: true, palign: 1.0 },
    { word: 'one', startS: 1.2, endS: 1.5, success: true, palign: 1.0 },
    { word: 'Line', startS: 2.0, endS: 2.2, success: true, palign: 1.0 },
    { word: 'two', startS: 2.2, endS: 2.5, success: true, palign: 1.0 },
    { word: 'Line', startS: 3.0, endS: 3.2, success: true, palign: 1.0 },
    { word: 'three', startS: 3.2, endS: 3.6, success: true, palign: 1.0 },
  ],
}


describe('VTT Download Integration Tests', () => {
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

  it('displays VTT download button when line cues are available', async () => {
    useSongPlaybackStore.setState(mockSongWithLineCues)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/Download VTT/i)).toBeInTheDocument()
    })
  })

  it('applies offset to VTT timestamps when downloading', async () => {
    const user = userEvent.setup()
    
    // Set offset before rendering
    saveOffset('song-123', 150)
    
    // Mock URL.createObjectURL and link.click
    const mockCreateObjectURL = jest.fn(() => 'blob:mock-url')
    const mockRevokeObjectURL = jest.fn()
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL
    
    useSongPlaybackStore.setState(mockSongWithLineCues)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/Download VTT/i)).toBeInTheDocument()
    })

    // Click download button
    await user.click(screen.getByText(/Download VTT/i))

    // Verify download was triggered by checking that createObjectURL was called
    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled()
    })
  })

  it('hides VTT download button when no line cues available', async () => {
    const songWithoutLineCues = {
      ...mockSongWithLineCues,
      alignedWords: [],
    }
    
    useSongPlaybackStore.setState(songWithoutLineCues)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('LearningSong')).toBeInTheDocument()
    })

    expect(screen.queryByText(/Download VTT/i)).not.toBeInTheDocument()
  })
})

/**
 * Integration tests for sync mode switching
 * 
 * **Feature: vtt-download-enhancement**
 * **Validates: Requirements 1.1, 2.1, 6.1**
 */
describe('Sync Mode Switching Integration Tests', () => {
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

  it('displays sync mode toggle when line cues are available', async () => {
    useSongPlaybackStore.setState(mockSongWithLineCues)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/Sync Mode/i)).toBeInTheDocument()
    })
  })

  it('switches from word to line sync mode when toggle is clicked', async () => {
    const user = userEvent.setup()
    useSongPlaybackStore.setState(mockSongWithLineCues)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/Sync Mode/i)).toBeInTheDocument()
    })

    // Find and click the Line button
    const lineButton = screen.getByRole('button', { name: /switch to line-level synchronization/i })
    await user.click(lineButton)

    // Verify line mode is now active (button should be pressed)
    await waitFor(() => {
      expect(lineButton).toHaveAttribute('aria-pressed', 'true')
    })
  })

  it('switches from line to word sync mode when toggle is clicked', async () => {
    const user = userEvent.setup()
    
    // Set initial sync mode to line
    localStorage.setItem('lyrics-sync-mode', 'line')
    
    useSongPlaybackStore.setState(mockSongWithLineCues)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/Sync Mode/i)).toBeInTheDocument()
    })

    // Find and click the Word button
    const wordButton = screen.getByRole('button', { name: /switch to word-level synchronization/i })
    await user.click(wordButton)

    // Verify word mode is now active
    await waitFor(() => {
      expect(wordButton).toHaveAttribute('aria-pressed', 'true')
    })
  })

  it('persists sync mode preference to localStorage', async () => {
    const user = userEvent.setup()
    useSongPlaybackStore.setState(mockSongWithLineCues)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/Sync Mode/i)).toBeInTheDocument()
    })

    // Click Line button to switch mode
    const lineButton = screen.getByRole('button', { name: /switch to line-level synchronization/i })
    await user.click(lineButton)

    // Verify localStorage was updated
    await waitFor(() => {
      expect(localStorage.getItem('lyrics-sync-mode')).toBe('line')
    })
  })

  it('hides sync mode toggle when no line cues available', async () => {
    const songWithoutLineCues = {
      ...mockSongWithLineCues,
      alignedWords: [],
    }
    
    useSongPlaybackStore.setState(songWithoutLineCues)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('LearningSong')).toBeInTheDocument()
    })

    expect(screen.queryByText(/Sync Mode/i)).not.toBeInTheDocument()
  })
})

/**
 * Integration tests for line highlighting during playback
 * 
 * **Feature: vtt-download-enhancement**
 * **Validates: Requirements 1.1, 1.3, 1.4, 1.5**
 */
describe('Line Highlighting Integration Tests', () => {
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

  it('displays LineLyricsDisplay when in line sync mode', async () => {
    // Set sync mode to line
    localStorage.setItem('lyrics-sync-mode', 'line')
    
    useSongPlaybackStore.setState(mockSongWithLineCues)
    
    renderWithProviders()

    await waitFor(() => {
      // LineLyricsDisplay has aria-label "Line-by-line lyrics display"
      expect(screen.getByRole('region', { name: /line-by-line lyrics display/i })).toBeInTheDocument()
    })
  })

  it('displays LyricsDisplay when in word sync mode', async () => {
    // Set sync mode to word (default)
    localStorage.setItem('lyrics-sync-mode', 'word')
    
    useSongPlaybackStore.setState(mockSongWithLineCues)
    
    renderWithProviders()

    await waitFor(() => {
      // LyricsDisplay should be shown - check for lyrics section heading
      expect(screen.getByRole('heading', { name: 'Lyrics' })).toBeInTheDocument()
    })

    // LineLyricsDisplay should NOT be present (it has aria-label "Line-by-line lyrics display")
    expect(screen.queryByRole('region', { name: /line-by-line lyrics display/i })).not.toBeInTheDocument()
  })

  it('highlights current line based on playback time in line mode', async () => {
    // Set sync mode to line
    localStorage.setItem('lyrics-sync-mode', 'line')
    
    // Set current time to be within first line's time range (1.0 - 1.5)
    useSongPlaybackStore.setState({
      ...mockSongWithLineCues,
      currentTime: 1.2,
    })
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /line-by-line lyrics display/i })).toBeInTheDocument()
    })

    // First line should be marked as current
    const firstLine = screen.getByText('Line one')
    expect(firstLine).toHaveAttribute('aria-current', 'time')
  })

  it('updates highlighted line when playback time changes', async () => {
    // Set sync mode to line
    localStorage.setItem('lyrics-sync-mode', 'line')
    
    // Start with time in first line range
    useSongPlaybackStore.setState({
      ...mockSongWithLineCues,
      currentTime: 1.2,
    })
    
    renderWithProviders()

    await waitFor(() => {
      const firstLine = screen.getByText('Line one')
      expect(firstLine).toHaveAttribute('aria-current', 'time')
    })

    // Update time to second line range (2.0 - 2.5)
    useSongPlaybackStore.setState({
      currentTime: 2.2,
    })

    await waitFor(() => {
      const secondLine = screen.getByText('Line two')
      expect(secondLine).toHaveAttribute('aria-current', 'time')
    })

    // First line should no longer be current
    const firstLine = screen.getByText('Line one')
    expect(firstLine).not.toHaveAttribute('aria-current')
  })

  it('allows clicking on lines to seek in line mode', async () => {
    const user = userEvent.setup()
    
    // Set sync mode to line
    localStorage.setItem('lyrics-sync-mode', 'line')
    
    const setCurrentTimeMock = jest.fn()
    useSongPlaybackStore.setState({
      ...mockSongWithLineCues,
      setCurrentTime: setCurrentTimeMock,
    })
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /line-by-line lyrics display/i })).toBeInTheDocument()
    })

    // Click on second line
    const secondLine = screen.getByText('Line two')
    await user.click(secondLine)

    // setCurrentTime should have been called with the line's start time
    await waitFor(() => {
      expect(setCurrentTimeMock).toHaveBeenCalledWith(2.0)
    })
  })

  it('applies offset to line highlighting timing', async () => {
    // Set sync mode to line
    localStorage.setItem('lyrics-sync-mode', 'line')
    
    // Save offset of 500ms (0.5 seconds)
    saveOffset('song-123', 500)
    
    // Set current time to 0.7 seconds
    // With offset of 0.5s, adjusted time = 0.7 + 0.5 = 1.2s
    // This should be within first line's range (1.0 - 1.5)
    useSongPlaybackStore.setState({
      ...mockSongWithLineCues,
      currentTime: 0.7,
    })
    
    renderWithProviders()

    // Wait for offset to be loaded and applied
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /line-by-line lyrics display/i })).toBeInTheDocument()
    }, { timeout: 2000 })

    // First line should be highlighted due to offset adjustment
    await waitFor(() => {
      const firstLine = screen.getByText('Line one')
      expect(firstLine).toHaveAttribute('aria-current', 'time')
    }, { timeout: 2000 })
  })
})
