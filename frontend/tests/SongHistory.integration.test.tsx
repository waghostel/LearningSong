/**
 * Integration tests for song history navigation flow
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SongHistoryPage } from '@/pages/SongHistoryPage'
import { SongPlaybackPage } from '@/pages/SongPlaybackPage'
import { useAuth } from '@/hooks/useAuth'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { apiClient } from '@/api/client'
import { MusicStyle } from '@/api/songs'

jest.mock('@/hooks/useAuth')
jest.mock('@/hooks/useNetworkStatus')
jest.mock('@/api/client')

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockedUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

Element.prototype.scrollIntoView = jest.fn()

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
          <Route path="/history" element={<SongHistoryPage />} />
          <Route path="/playback/:songId" element={<SongPlaybackPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const mockSongHistory = [
  {
    song_id: 'song-1',
    style: MusicStyle.POP,
    created_at: new Date('2024-12-03T10:00:00Z').toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    lyrics_preview: 'This is the first song lyrics preview...',
    has_variations: true,
    primary_variation_index: 0,
  },
  {
    song_id: 'song-2',
    style: MusicStyle.RAP,
    created_at: new Date('2024-12-02T10:00:00Z').toISOString(),
    expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    lyrics_preview: 'This is the second song lyrics preview...',
    has_variations: false,
    primary_variation_index: 0,
  },
]


describe('Song History Navigation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    
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

  it('displays song history list when API returns songs', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: mockSongHistory,
    })
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/This is the first song lyrics preview/i)).toBeInTheDocument()
      expect(screen.getByText(/This is the second song lyrics preview/i)).toBeInTheDocument()
    })
  })

  it('navigates to playback page when song is clicked', async () => {
    const user = userEvent.setup()
    
    mockedApiClient.get.mockResolvedValueOnce({
      data: mockSongHistory,
    })
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/This is the first song lyrics preview/i)).toBeInTheDocument()
    })

    // Click on first song
    const firstSong = screen.getByText(/This is the first song lyrics preview/i).closest('div[role="button"]')
    if (firstSong) {
      await user.click(firstSong)
    }

    // Should navigate to playback page
    await waitFor(() => {
      expect(window.location.pathname).toContain('/playback/')
    })
  })

  it('displays empty state when no songs available', async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: [],
    })
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/No songs yet/i)).toBeInTheDocument()
    })
  })

  it('displays error state when API fails', async () => {
    mockedApiClient.get.mockRejectedValueOnce(new Error('Network error'))
    
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/Failed to load song history/i)).toBeInTheDocument()
    })
  })

  it('shows loading state while fetching history', async () => {
    mockedApiClient.get.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: mockSongHistory }), 100))
    )
    
    renderWithProviders()

    expect(screen.getByText(/Loading/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/This is the first song lyrics preview/i)).toBeInTheDocument()
    })
  })
})
