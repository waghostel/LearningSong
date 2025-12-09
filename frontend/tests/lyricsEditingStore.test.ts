import { renderHook, act } from '@testing-library/react'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import { MusicStyle } from '@/api/songs'

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

  // Version Management Unit Tests (Task 3.6)
  describe('Version Management', () => {
    it('adds a new version with unique ID and timestamp', () => {
      const { result } = renderHook(() => useLyricsEditingStore())
      
      act(() => {
        result.current.addVersion('Version 1 lyrics')
      })
      
      expect(result.current.versions.length).toBe(1)
      expect(result.current.versions[0].lyrics).toBe('Version 1 lyrics')
      expect(result.current.versions[0].id).toBeTruthy()
      expect(result.current.versions[0].createdAt).toBeTruthy()
      expect(result.current.versions[0].isEdited).toBe(false)
      expect(result.current.activeVersionId).toBe(result.current.versions[0].id)
    })

    it('adds multiple versions with unique IDs', () => {
      const { result } = renderHook(() => useLyricsEditingStore())
      
      act(() => {
        result.current.addVersion('Version 1')
        result.current.addVersion('Version 2')
        result.current.addVersion('Version 3')
      })
      
      expect(result.current.versions.length).toBe(3)
      
      const ids = result.current.versions.map(v => v.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(3)
    })

    it('switches active version correctly', () => {
      const { result } = renderHook(() => useLyricsEditingStore())
      
      act(() => {
        result.current.addVersion('Version 1')
        result.current.addVersion('Version 2')
      })
      
      const version1Id = result.current.versions[0].id
      const version2Id = result.current.versions[1].id
      
      expect(result.current.activeVersionId).toBe(version2Id)
      
      act(() => {
        result.current.setActiveVersion(version1Id)
      })
      
      expect(result.current.activeVersionId).toBe(version1Id)
      expect(result.current.editedLyrics).toBe('Version 1')
    })

    it('deletes a non-active version', () => {
      const { result } = renderHook(() => useLyricsEditingStore())
      
      act(() => {
        result.current.addVersion('Version 1')
        result.current.addVersion('Version 2')
      })
      
      const version1Id = result.current.versions[0].id
      const version2Id = result.current.versions[1].id
      
      act(() => {
        result.current.deleteVersion(version1Id)
      })
      
      expect(result.current.versions.length).toBe(1)
      expect(result.current.versions[0].id).toBe(version2Id)
      expect(result.current.activeVersionId).toBe(version2Id)
    })

    it('deletes active version and switches to most recent', () => {
      const { result } = renderHook(() => useLyricsEditingStore())
      
      act(() => {
        result.current.addVersion('Version 1')
        result.current.addVersion('Version 2')
      })
      
      const version1Id = result.current.versions[0].id
      const version2Id = result.current.versions[1].id
      
      expect(result.current.activeVersionId).toBe(version2Id)
      
      act(() => {
        result.current.deleteVersion(version2Id)
      })
      
      expect(result.current.versions.length).toBe(1)
      expect(result.current.activeVersionId).toBe(version1Id)
    })

    it('does not delete when only one version remains', () => {
      const { result } = renderHook(() => useLyricsEditingStore())
      
      act(() => {
        result.current.addVersion('Only version')
      })
      
      const versionId = result.current.versions[0].id
      
      act(() => {
        result.current.deleteVersion(versionId)
      })
      
      expect(result.current.versions.length).toBe(1)
      expect(result.current.activeVersionId).toBe(versionId)
    })

    it('tracks edits correctly', () => {
      const { result } = renderHook(() => useLyricsEditingStore())
      
      act(() => {
        result.current.addVersion('Original lyrics')
      })
      
      const versionId = result.current.versions[0].id
      
      act(() => {
        result.current.updateVersionEdits(versionId, 'Modified lyrics')
      })
      
      expect(result.current.versions[0].isEdited).toBe(true)
      expect(result.current.versions[0].editedLyrics).toBe('Modified lyrics')
      expect(result.current.editedLyrics).toBe('Modified lyrics')
    })

    it('clears edit flag when lyrics match original', () => {
      const { result } = renderHook(() => useLyricsEditingStore())
      
      act(() => {
        result.current.addVersion('Original lyrics')
      })
      
      const versionId = result.current.versions[0].id
      
      act(() => {
        result.current.updateVersionEdits(versionId, 'Modified lyrics')
      })
      
      expect(result.current.versions[0].isEdited).toBe(true)
      
      act(() => {
        result.current.updateVersionEdits(versionId, 'Original lyrics')
      })
      
      expect(result.current.versions[0].isEdited).toBe(false)
      expect(result.current.versions[0].editedLyrics).toBeUndefined()
    })

    it('preserves edits when switching versions', () => {
      const { result } = renderHook(() => useLyricsEditingStore())
      
      act(() => {
        result.current.addVersion('Version 1')
        result.current.addVersion('Version 2')
      })
      
      const version1Id = result.current.versions[0].id
      
      // Modify the active version (version 2)
      act(() => {
        result.current.setEditedLyrics('Version 2 modified')
      })
      
      // Switch to version 1
      act(() => {
        result.current.setActiveVersion(version1Id)
      })
      
      // Version 2 should have its edits saved
      const version2 = result.current.versions.find(v => v.id !== version1Id)
      expect(version2?.isEdited).toBe(true)
      expect(version2?.editedLyrics).toBe('Version 2 modified')
    })

    it('restores edited content when switching back', () => {
      const { result } = renderHook(() => useLyricsEditingStore())
      
      act(() => {
        result.current.addVersion('Version 1')
      })
      
      const version1Id = result.current.versions[0].id
      
      // Edit version 1
      act(() => {
        result.current.updateVersionEdits(version1Id, 'Version 1 edited')
      })
      
      // Add version 2 (switches to it)
      act(() => {
        result.current.addVersion('Version 2')
      })
      
      // Switch back to version 1
      act(() => {
        result.current.setActiveVersion(version1Id)
      })
      
      // Should show edited lyrics
      expect(result.current.editedLyrics).toBe('Version 1 edited')
    })

    it('limits versions to maximum of 10', () => {
      const { result } = renderHook(() => useLyricsEditingStore())
      
      // Add 12 versions
      for (let i = 0; i < 12; i++) {
        act(() => {
          result.current.addVersion(`Version ${i + 1}`)
        })
      }
      
      expect(result.current.versions.length).toBe(10)
    })

    it('clears version history when content changes', () => {
      const { result } = renderHook(() => useLyricsEditingStore())
      
      act(() => {
        result.current.setOriginalContent('Content 1')
        result.current.addVersion('Version 1')
        result.current.addVersion('Version 2')
      })
      
      expect(result.current.versions.length).toBe(2)
      
      act(() => {
        result.current.setOriginalContent('Content 2')
      })
      
      expect(result.current.versions.length).toBe(0)
      expect(result.current.activeVersionId).toBeNull()
    })

    it('handles regeneration flow correctly', () => {
      const { result } = renderHook(() => useLyricsEditingStore())
      
      act(() => {
        result.current.startRegeneration()
      })
      
      expect(result.current.isRegenerating).toBe(true)
      expect(result.current.regenerationError).toBeNull()
      
      act(() => {
        result.current.completeRegeneration('New regenerated lyrics')
      })
      
      expect(result.current.isRegenerating).toBe(false)
      expect(result.current.versions.length).toBe(1)
      expect(result.current.editedLyrics).toBe('New regenerated lyrics')
    })

    it('handles regeneration failure correctly', () => {
      const { result } = renderHook(() => useLyricsEditingStore())
      
      act(() => {
        result.current.addVersion('Existing version')
      })
      
      const versionsBeforeError = result.current.versions.length
      
      act(() => {
        result.current.startRegeneration()
        result.current.failRegeneration('API Error')
      })
      
      expect(result.current.isRegenerating).toBe(false)
      expect(result.current.regenerationError).toBe('API Error')
      expect(result.current.versions.length).toBe(versionsBeforeError)
    })

    // Task 14.1: Version limit unit tests
    describe('Version Limit and Cleanup', () => {
      it('auto-deletes oldest version when adding 11th version', () => {
        const { result } = renderHook(() => useLyricsEditingStore())
        
        // Add 10 versions with distinct timestamps
        for (let i = 0; i < 10; i++) {
          act(() => {
            result.current.addVersion(`Version ${i + 1}`)
          })
        }
        
        expect(result.current.versions.length).toBe(10)
        
        // Remember the first version (oldest)
        const oldestVersionLyrics = result.current.versions[0].lyrics
        expect(oldestVersionLyrics).toBe('Version 1')
        
        // Add 11th version
        act(() => {
          result.current.addVersion('Version 11')
        })
        
        // Should still have 10 versions
        expect(result.current.versions.length).toBe(10)
        
        // Oldest version should be removed
        const allLyrics = result.current.versions.map(v => v.lyrics)
        expect(allLyrics).not.toContain('Version 1')
        expect(allLyrics).toContain('Version 11')
      })

      it('shows version limit warning when approaching max versions', () => {
        const { result } = renderHook(() => useLyricsEditingStore())
        
        // Initially no warning
        expect(result.current.getIsApproachingVersionLimit()).toBe(false)
        expect(result.current.getVersionCount()).toBe(0)
        
        // Add 7 versions - still no warning
        for (let i = 0; i < 7; i++) {
          act(() => {
            result.current.addVersion(`Version ${i + 1}`)
          })
        }
        expect(result.current.getIsApproachingVersionLimit()).toBe(false)
        expect(result.current.getVersionCount()).toBe(7)
        
        // Add 8th version - warning should appear (threshold is 8)
        act(() => {
          result.current.addVersion('Version 8')
        })
        expect(result.current.getIsApproachingVersionLimit()).toBe(true)
        expect(result.current.getVersionCount()).toBe(8)
      })

      it('shows warning at 9 and 10 versions', () => {
        const { result } = renderHook(() => useLyricsEditingStore())
        
        // Add 9 versions
        for (let i = 0; i < 9; i++) {
          act(() => {
            result.current.addVersion(`Version ${i + 1}`)
          })
        }
        expect(result.current.getIsApproachingVersionLimit()).toBe(true)
        expect(result.current.getVersionCount()).toBe(9)
        
        // Add 10th version
        act(() => {
          result.current.addVersion('Version 10')
        })
        expect(result.current.getIsApproachingVersionLimit()).toBe(true)
        expect(result.current.getVersionCount()).toBe(10)
      })

      it('removes correct oldest version based on createdAt timestamp', () => {
        const { result } = renderHook(() => useLyricsEditingStore())
        
        // Add versions and track their order
        for (let i = 0; i < 10; i++) {
          act(() => {
            result.current.addVersion(`Version ${i + 1}`)
          })
        }
        
        // Get the second oldest version's lyrics (after cleanup, it should become oldest)
        const secondOldest = result.current.versions[1].lyrics
        
        // Add another version to trigger cleanup
        act(() => {
          result.current.addVersion('Version 11')
        })
        
        // Now the old second oldest should be the new oldest
        expect(result.current.versions[0].lyrics).toBe(secondOldest)
      })

      it('limits versions via completeRegeneration as well', () => {
        const { result } = renderHook(() => useLyricsEditingStore())
        
        // Add 10 versions
        for (let i = 0; i < 10; i++) {
          act(() => {
            result.current.addVersion(`Version ${i + 1}`)
          })
        }
        
        expect(result.current.versions.length).toBe(10)
        
        // Complete a regeneration (should also trigger cleanup)
        act(() => {
          result.current.startRegeneration()
          result.current.completeRegeneration('Regenerated Version')
        })
        
        // Should still have max 10 versions
        expect(result.current.versions.length).toBe(10)
        
        // Should contain the regenerated version
        const allLyrics = result.current.versions.map(v => v.lyrics)
        expect(allLyrics).toContain('Regenerated Version')
        expect(allLyrics).not.toContain('Version 1')
      })
    })
  })
})
