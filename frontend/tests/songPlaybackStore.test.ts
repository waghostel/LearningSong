import { renderHook, act, waitFor } from '@testing-library/react'
import { useSongPlaybackStore } from '@/stores/songPlaybackStore'
import { MusicStyle } from '@/api/songs'

// Mock the API functions
jest.mock('@/api/songs', () => ({
  ...jest.requireActual('@/api/songs'),
  getSongDetails: jest.fn(),
  getSharedSong: jest.fn(),
  createShareLink: jest.fn(),
}))

import { getSongDetails, getSharedSong, createShareLink } from '@/api/songs'

const mockGetSongDetails = getSongDetails as jest.MockedFunction<typeof getSongDetails>
const mockGetSharedSong = getSharedSong as jest.MockedFunction<typeof getSharedSong>
const mockCreateShareLink = createShareLink as jest.MockedFunction<typeof createShareLink>

const mockSongDetails = {
  song_id: 'song-123',
  song_url: 'https://example.com/song.mp3',
  variations: [
    {
      audio_url: 'https://example.com/song.mp3',
      audio_id: 'audio-123',
      variation_index: 0,
    },
  ],
  primary_variation_index: 0,
  lyrics: 'Test lyrics for the song',
  style: MusicStyle.POP,
  created_at: '2025-11-28T10:00:00Z',
  expires_at: '2025-11-30T10:00:00Z',
  is_owner: true,
}

describe('songPlaybackStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
    jest.clearAllMocks()
    
    // Reset store to initial state
    const { result } = renderHook(() => useSongPlaybackStore())
    act(() => {
      result.current.reset()
    })
  })

  describe('initial state', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() => useSongPlaybackStore())
      
      expect(result.current.songId).toBeNull()
      expect(result.current.songUrl).toBeNull()
      expect(result.current.lyrics).toBe('')
      expect(result.current.style).toBeNull()
      expect(result.current.createdAt).toBeNull()
      expect(result.current.expiresAt).toBeNull()
      expect(result.current.isOwner).toBe(false)
      expect(result.current.isPlaying).toBe(false)
      expect(result.current.currentTime).toBe(0)
      expect(result.current.duration).toBe(0)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.shareUrl).toBeNull()
      expect(result.current.isSharing).toBe(false)
    })
  })


  describe('loadSong action', () => {
    it('loads song details successfully', async () => {
      mockGetSongDetails.mockResolvedValueOnce(mockSongDetails)
      
      const { result } = renderHook(() => useSongPlaybackStore())
      
      await act(async () => {
        await result.current.loadSong('song-123')
      })
      
      expect(mockGetSongDetails).toHaveBeenCalledWith('song-123')
      expect(result.current.songId).toBe('song-123')
      expect(result.current.songUrl).toBe('https://example.com/song.mp3')
      expect(result.current.lyrics).toBe('Test lyrics for the song')
      expect(result.current.style).toBe(MusicStyle.POP)
      expect(result.current.isOwner).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('sets loading state while fetching', async () => {
      let resolvePromise: (value: typeof mockSongDetails) => void
      mockGetSongDetails.mockImplementationOnce(() => 
        new Promise(resolve => { resolvePromise = resolve })
      )
      
      const { result } = renderHook(() => useSongPlaybackStore())
      
      act(() => {
        result.current.loadSong('song-123')
      })
      
      expect(result.current.isLoading).toBe(true)
      
      await act(async () => {
        resolvePromise!(mockSongDetails)
      })
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('handles load error', async () => {
      mockGetSongDetails.mockRejectedValueOnce(new Error('Song not found'))
      
      const { result } = renderHook(() => useSongPlaybackStore())
      
      try {
        await act(async () => {
          await result.current.loadSong('invalid-id')
        })
      } catch {
        // Expected to throw
      }
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBe('Song not found')
      })
    })
  })

  describe('loadSharedSong action', () => {
    it('loads shared song successfully', async () => {
      const sharedSongDetails = { ...mockSongDetails, is_owner: false }
      mockGetSharedSong.mockResolvedValueOnce(sharedSongDetails)
      
      const { result } = renderHook(() => useSongPlaybackStore())
      
      await act(async () => {
        await result.current.loadSharedSong('share-token-abc')
      })
      
      expect(mockGetSharedSong).toHaveBeenCalledWith('share-token-abc')
      expect(result.current.songId).toBe('song-123')
      expect(result.current.isOwner).toBe(false)
      expect(result.current.isLoading).toBe(false)
    })

    it('handles expired share link error', async () => {
      mockGetSharedSong.mockRejectedValueOnce(new Error('Share link has expired'))
      
      const { result } = renderHook(() => useSongPlaybackStore())
      
      try {
        await act(async () => {
          await result.current.loadSharedSong('expired-token')
        })
      } catch {
        // Expected to throw
      }
      
      await waitFor(() => {
        expect(result.current.error).toBe('Share link has expired')
      })
    })
  })

  describe('playback state actions', () => {
    it('sets playback state to playing', () => {
      const { result } = renderHook(() => useSongPlaybackStore())
      
      act(() => {
        result.current.setPlaybackState(true)
      })
      
      expect(result.current.isPlaying).toBe(true)
    })

    it('sets playback state to paused', () => {
      const { result } = renderHook(() => useSongPlaybackStore())
      
      act(() => {
        result.current.setPlaybackState(true)
        result.current.setPlaybackState(false)
      })
      
      expect(result.current.isPlaying).toBe(false)
    })

    it('updates current time', () => {
      const { result } = renderHook(() => useSongPlaybackStore())
      
      act(() => {
        result.current.setCurrentTime(45.5)
      })
      
      expect(result.current.currentTime).toBe(45.5)
    })

    it('updates duration', () => {
      const { result } = renderHook(() => useSongPlaybackStore())
      
      act(() => {
        result.current.setDuration(180)
      })
      
      expect(result.current.duration).toBe(180)
    })
  })


  describe('createShareLink action', () => {
    it('creates share link successfully', async () => {
      mockGetSongDetails.mockResolvedValueOnce(mockSongDetails)
      mockCreateShareLink.mockResolvedValueOnce({
        share_url: 'https://example.com/shared/abc123',
        share_token: 'abc123',
        expires_at: '2025-11-30T10:00:00Z',
      })
      
      const { result } = renderHook(() => useSongPlaybackStore())
      
      // First load a song
      await act(async () => {
        await result.current.loadSong('song-123')
      })
      
      let shareUrl: string
      await act(async () => {
        shareUrl = await result.current.createShareLink()
      })
      
      expect(mockCreateShareLink).toHaveBeenCalledWith('song-123')
      expect(shareUrl!).toBe('https://example.com/shared/abc123')
      expect(result.current.shareUrl).toBe('https://example.com/shared/abc123')
      expect(result.current.isSharing).toBe(false)
    })

    it('throws error when no song is loaded', async () => {
      const { result } = renderHook(() => useSongPlaybackStore())
      
      await expect(
        act(async () => {
          await result.current.createShareLink()
        })
      ).rejects.toThrow('No song loaded')
    })

    it('sets sharing state while creating link', async () => {
      mockGetSongDetails.mockResolvedValueOnce(mockSongDetails)
      
      let resolvePromise: (value: { share_url: string; share_token: string; expires_at: string }) => void
      mockCreateShareLink.mockImplementationOnce(() => 
        new Promise(resolve => { resolvePromise = resolve })
      )
      
      const { result } = renderHook(() => useSongPlaybackStore())
      
      await act(async () => {
        await result.current.loadSong('song-123')
      })
      
      act(() => {
        result.current.createShareLink()
      })
      
      expect(result.current.isSharing).toBe(true)
      
      await act(async () => {
        resolvePromise!({
          share_url: 'https://example.com/shared/abc123',
          share_token: 'abc123',
          expires_at: '2025-11-30T10:00:00Z',
        })
      })
      
      await waitFor(() => {
        expect(result.current.isSharing).toBe(false)
      })
    })

    it('handles share link creation error', async () => {
      mockGetSongDetails.mockResolvedValueOnce(mockSongDetails)
      mockCreateShareLink.mockRejectedValueOnce(new Error('Failed to create share link'))
      
      const { result } = renderHook(() => useSongPlaybackStore())
      
      await act(async () => {
        await result.current.loadSong('song-123')
      })
      
      try {
        await act(async () => {
          await result.current.createShareLink()
        })
      } catch {
        // Expected to throw
      }
      
      await waitFor(() => {
        expect(result.current.isSharing).toBe(false)
      })
    })
  })

  describe('reset action', () => {
    it('resets to initial state', async () => {
      mockGetSongDetails.mockResolvedValueOnce(mockSongDetails)
      
      const { result } = renderHook(() => useSongPlaybackStore())
      
      // Set various values
      await act(async () => {
        await result.current.loadSong('song-123')
        result.current.setPlaybackState(true)
        result.current.setCurrentTime(60)
        result.current.setDuration(180)
      })
      
      // Reset
      act(() => {
        result.current.reset()
      })
      
      expect(result.current.songId).toBeNull()
      expect(result.current.songUrl).toBeNull()
      expect(result.current.lyrics).toBe('')
      expect(result.current.style).toBeNull()
      expect(result.current.isPlaying).toBe(false)
      expect(result.current.currentTime).toBe(0)
      expect(result.current.duration).toBe(0)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('sessionStorage persistence', () => {
    it('persists song data to sessionStorage', async () => {
      mockGetSongDetails.mockResolvedValueOnce(mockSongDetails)
      
      const { result } = renderHook(() => useSongPlaybackStore())
      
      await act(async () => {
        await result.current.loadSong('song-123')
      })
      
      const stored = sessionStorage.getItem('song-playback-storage')
      expect(stored).toBeTruthy()
      
      const parsed = JSON.parse(stored!)
      expect(parsed.state.songId).toBe('song-123')
      expect(parsed.state.songUrl).toBe('https://example.com/song.mp3')
      expect(parsed.state.lyrics).toBe('Test lyrics for the song')
    })

    it('does not persist playback state', async () => {
      mockGetSongDetails.mockResolvedValueOnce(mockSongDetails)
      
      const { result } = renderHook(() => useSongPlaybackStore())
      
      await act(async () => {
        await result.current.loadSong('song-123')
        result.current.setPlaybackState(true)
        result.current.setCurrentTime(60)
      })
      
      const stored = sessionStorage.getItem('song-playback-storage')
      const parsed = JSON.parse(stored!)
      
      // Playback state should not be persisted
      expect(parsed.state.isPlaying).toBeUndefined()
      expect(parsed.state.currentTime).toBeUndefined()
    })
  })
})
