/**
 * Integration tests for song switcher with variations
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

const mockSongWithVariations = {
  songId: 'song-123',
  songUrl: 'https://example.com/song-v1.mp3',
  lyrics: 'Test lyrics',
  style: MusicStyle.POP,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  isOwner: true,
  isLoading: false,
  error: null,
  songVariations: [
    {
      audio_url: 'https://example.com/song-v1.mp3',
      audio_id: 'audio-1',
      variation_index: 0,
    },
    {
      audio_url: 'https://example.com/song-v2.mp3',
      audio_id: 'audio-2',
      variation_index: 1,
    },
  ],
  primaryVariationIndex: 0,
}

describe('Song Switcher Integration Tests', () => {
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

  it('displays song switcher when 2 variations exist', async () => {
    useSongPlaybackStore.setState(mockSongWithVariations)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('song-switcher')).toBeInTheDocument()
      expect(screen.getByLabelText(/Version 1/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Version 2/)).toBeInTheDocument()
    })
  })


  it('hides song switcher when only 1 variation exists', async () => {
    const songWithOneVariation = {
      ...mockSongWithVariations,
      songVariations: [mockSongWithVariations.songVariations[0]],
    }
    
    useSongPlaybackStore.setState(songWithOneVariation)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('LearningSong')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('song-switcher')).not.toBeInTheDocument()
  })

  it('switches audio URL when variation is selected', async () => {
    const user = userEvent.setup()
    
    useSongPlaybackStore.setState(mockSongWithVariations)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByLabelText(/Version 2/)).toBeInTheDocument()
    })

    // Click Version 2
    const version2Button = screen.getByLabelText(/Version 2/)
    await user.click(version2Button)

    // Verify button is now active
    await waitFor(() => {
      expect(version2Button).toHaveAttribute('aria-current', 'true')
    })
  })

  it('shows active variation indication', async () => {
    useSongPlaybackStore.setState(mockSongWithVariations)
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/Currently playing Version 1/)).toBeInTheDocument()
    })
  })

  it('disables switcher when song is expired', async () => {
    const expiredSong = {
      ...mockSongWithVariations,
      expiresAt: new Date(Date.now() - 1000),
    }
    
    useSongPlaybackStore.setState(expiredSong)
    
    renderWithProviders()

    await waitFor(() => {
      const version1Button = screen.getByLabelText(/Version 1/)
      expect(version1Button).toBeDisabled()
    })
  })

  it('displays both variations in the switcher', async () => {
    useSongPlaybackStore.setState(mockSongWithVariations)
    
    renderWithProviders()

    await waitFor(() => {
      const version1 = screen.getByLabelText(/Version 1/)
      const version2 = screen.getByLabelText(/Version 2/)
      
      expect(version1).toBeInTheDocument()
      expect(version2).toBeInTheDocument()
    })
  })

  it('positions switcher near audio player', async () => {
    useSongPlaybackStore.setState(mockSongWithVariations)
    
    renderWithProviders()

    await waitFor(() => {
      const audioPlayer = screen.getAllByRole('region', { name: /audio player/i })[0]
      const songSwitcher = screen.getByTestId('song-switcher')

      // Both should be in the same section
      const audioPlayerSection = audioPlayer.closest('section')
      expect(audioPlayerSection).toContainElement(songSwitcher)
    })
  })
})
