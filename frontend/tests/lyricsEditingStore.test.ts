import { renderHook, act } from '@testing-library/react'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import { MusicStyle } from '@/api/songs'
import { beforeEach } from 'node:test'

describe('lyricsEditingStore', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()
    
    // Reset store to initial state
    const { result } = renderHook(() => useLyricsEditingStore())
    act(() => {
      result.current.reset()
    })
  })

  it('initializes with default values', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    expect(result.current.originalLyrics).toBe('')
    expect(result.current.editedLyrics).toBe('')
    expect(result.current.selectedStyle).toBe(MusicStyle.POP)
    expect(result.current.contentHash).toBe('')
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.taskId).toBeNull()
    expect(result.current.generationStatus).toBe('idle')
    expect(result.current.progress).toBe(0)
    expect(result.current.songUrl).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('sets original lyrics and copies to edited lyrics', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    act(() => {
      result.current.setOriginalLyrics('Original lyrics text')
    })
    
    expect(result.current.originalLyrics).toBe('Original lyrics text')
    expect(result.current.editedLyrics).toBe('Original lyrics text')
  })

  it('updates edited lyrics independently', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    act(() => {
      result.current.setOriginalLyrics('Original lyrics')
      result.current.setEditedLyrics('Modified lyrics')
    })
    
    expect(result.current.originalLyrics).toBe('Original lyrics')
    expect(result.current.editedLyrics).toBe('Modified lyrics')
  })

  it('updates selected style', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    act(() => {
      result.current.setSelectedStyle(MusicStyle.ROCK)
    })
    
    expect(result.current.selectedStyle).toBe(MusicStyle.ROCK)
  })

  it('updates content hash', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    act(() => {
      result.current.setContentHash('abc123hash')
    })
    
    expect(result.current.contentHash).toBe('abc123hash')
  })

  it('starts generation with task ID', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    act(() => {
      result.current.startGeneration('task-123')
    })
    
    expect(result.current.isGenerating).toBe(true)
    expect(result.current.taskId).toBe('task-123')
    expect(result.current.generationStatus).toBe('queued')
    expect(result.current.progress).toBe(0)
    expect(result.current.songUrl).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('updates progress and status', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    act(() => {
      result.current.startGeneration('task-123')
      result.current.updateProgress('processing', 50)
    })
    
    expect(result.current.generationStatus).toBe('processing')
    expect(result.current.progress).toBe(50)
  })

  it('completes generation successfully', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    act(() => {
      result.current.startGeneration('task-123')
      result.current.completeGeneration('https://example.com/song.mp3')
    })
    
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.generationStatus).toBe('completed')
    expect(result.current.progress).toBe(100)
    expect(result.current.songUrl).toBe('https://example.com/song.mp3')
    expect(result.current.error).toBeNull()
  })

  it('handles generation failure', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    act(() => {
      result.current.startGeneration('task-123')
      result.current.failGeneration('API timeout error', true)
    })
    
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.generationStatus).toBe('failed')
    expect(result.current.error).toBe('API timeout error')
    expect(result.current.canRetry).toBe(true)
  })

  it('resets to initial state', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    // Set various values
    act(() => {
      result.current.setOriginalLyrics('Original')
      result.current.setEditedLyrics('Edited')
      result.current.setSelectedStyle(MusicStyle.JAZZ)
      result.current.setContentHash('hash123')
      result.current.startGeneration('task-456')
      result.current.updateProgress('processing', 75)
    })
    
    // Reset
    act(() => {
      result.current.reset()
    })
    
    expect(result.current.originalLyrics).toBe('')
    expect(result.current.editedLyrics).toBe('')
    expect(result.current.selectedStyle).toBe(MusicStyle.POP)
    expect(result.current.contentHash).toBe('')
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.taskId).toBeNull()
    expect(result.current.generationStatus).toBe('idle')
    expect(result.current.progress).toBe(0)
    expect(result.current.songUrl).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('handles all music styles', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    const styles = [
      MusicStyle.POP,
      MusicStyle.RAP,
      MusicStyle.FOLK,
      MusicStyle.ELECTRONIC,
      MusicStyle.ROCK,
      MusicStyle.JAZZ,
      MusicStyle.CHILDREN,
      MusicStyle.CLASSICAL
    ]
    
    styles.forEach((style) => {
      act(() => {
        result.current.setSelectedStyle(style)
      })
      expect(result.current.selectedStyle).toBe(style)
    })
  })

  it('handles all generation statuses', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    const statuses = ['idle', 'queued', 'processing', 'completed', 'failed'] as const
    
    statuses.forEach((status) => {
      act(() => {
        result.current.updateProgress(status, 0)
      })
      expect(result.current.generationStatus).toBe(status)
    })
  })

  it('persists state to sessionStorage', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    act(() => {
      result.current.setOriginalLyrics('Test lyrics')
      result.current.setSelectedStyle(MusicStyle.ROCK)
      result.current.setContentHash('hash456')
    })
    
    // Check sessionStorage
    const stored = sessionStorage.getItem('lyrics-editing-storage')
    expect(stored).toBeTruthy()
    
    const parsed = JSON.parse(stored!)
    expect(parsed.state.originalLyrics).toBe('Test lyrics')
    expect(parsed.state.selectedStyle).toBe(MusicStyle.ROCK)
    expect(parsed.state.contentHash).toBe('hash456')
  })

  it('persists generation state for recovery', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    act(() => {
      result.current.startGeneration('task-789')
      result.current.updateProgress('processing', 60)
    })
    
    const stored = sessionStorage.getItem('lyrics-editing-storage')
    const parsed = JSON.parse(stored!)
    
    // Verify generation state is persisted
    expect(parsed.state.taskId).toBe('task-789')
    expect(parsed.state.generationStatus).toBe('processing')
    expect(parsed.state.progress).toBe(60)
  })

  it('clears error on new generation', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    act(() => {
      result.current.failGeneration('Previous error', true)
      result.current.startGeneration('task-new')
    })
    
    expect(result.current.error).toBeNull()
    expect(result.current.errorInfo).toBeNull()
    expect(result.current.isGenerating).toBe(true)
  })

  it('stores lastRequest when starting generation', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    act(() => {
      result.current.setEditedLyrics('Test lyrics for song')
      result.current.setSelectedStyle(MusicStyle.JAZZ)
      result.current.setContentHash('hash-abc')
      result.current.startGeneration('task-123')
    })
    
    expect(result.current.lastRequest).toEqual({
      lyrics: 'Test lyrics for song',
      style: MusicStyle.JAZZ,
      content_hash: 'hash-abc',
    })
  })

  it('handles non-retryable failure', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    act(() => {
      result.current.startGeneration('task-123')
      result.current.failGeneration('Rate limit exceeded', false)
    })
    
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.generationStatus).toBe('failed')
    expect(result.current.error).toBe('Rate limit exceeded')
    expect(result.current.canRetry).toBe(false)
  })

  it('handles failure with errorInfo', () => {
    const { result } = renderHook(() => useLyricsEditingStore())
    
    const errorInfo = {
      type: 'rate_limit' as unknown as import('@/lib/error-utils').ErrorType,
      message: 'Rate limit exceeded',
      userMessage: 'You have reached your song generation limit.',
      retryable: false,
      retryDelay: 3600000,
      statusCode: 429,
    }
    
    act(() => {
      result.current.startGeneration('task-123')
      result.current.failGeneration('Rate limit exceeded', false, errorInfo)
    })
    
    expect(result.current.errorInfo).toEqual(errorInfo)
  })

  it('restores state from sessionStorage on mount', () => {
    // Pre-populate sessionStorage
    const storedState = {
      state: {
        originalLyrics: 'Stored lyrics',
        editedLyrics: 'Stored edited lyrics',
        selectedStyle: MusicStyle.ELECTRONIC,
        contentHash: 'stored-hash',
        isGenerating: false,
        taskId: 'stored-task',
        generationStatus: 'processing',
        progress: 45,
        songUrl: null,
        error: null,
        errorInfo: null,
        canRetry: false,
        lastRequest: null,
      },
      version: 0,
    }
    sessionStorage.setItem('lyrics-editing-storage', JSON.stringify(storedState))
    
    // Clear the store's in-memory state by getting a fresh hook
    useLyricsEditingStore.persist.rehydrate()
    
    const { result } = renderHook(() => useLyricsEditingStore())
    
    expect(result.current.originalLyrics).toBe('Stored lyrics')
    expect(result.current.editedLyrics).toBe('Stored edited lyrics')
    expect(result.current.selectedStyle).toBe(MusicStyle.ELECTRONIC)
    expect(result.current.taskId).toBe('stored-task')
    expect(result.current.generationStatus).toBe('processing')
    expect(result.current.progress).toBe(45)
  })
})
