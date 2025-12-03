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
    
    const mockClick = jest.fn()
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = document.createElement(tagName)
      if (tagName === 'a') {
        element.click = mockClick
      }
      return element
    })
    
    useSongPlaybackStore.setState(mockSongWithLineCues)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/Download VTT/i)).toBeInTheDocument()
    })

    // Click download button
    await user.click(screen.getByText(/Download VTT/i))

    // Verify download was triggered
    await waitFor(() => {
      expect(mockClick).toHaveBeenCalled()
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
