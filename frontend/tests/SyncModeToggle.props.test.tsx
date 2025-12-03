/**
 * Property-based tests for SyncModeToggle component
 * Using fast-check for property-based testing
 * 
 * **Feature: song-playback-improvements, Property 25: Sync mode toggle persistence**
 * **Validates: Requirements 9.5**
 */
import * as fc from 'fast-check'
import { loadSyncMode, saveSyncMode, type SyncMode } from '@/components/SyncModeToggle'

describe('SyncModeToggle Property Tests', () => {
  // Clear localStorage before each test
  beforeEach(() => {
    localStorage.clear()
  })

  /**
   * **Feature: song-playback-improvements, Property 25: Sync mode toggle persistence**
   * **Validates: Requirements 9.5**
   * 
   * For any sync mode preference saved to localStorage, loading the playback page
   * should restore the same sync mode.
   */
  describe('Property 25: Sync mode toggle persistence', () => {
    it('should save and restore sync mode from localStorage', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<SyncMode>('word', 'line'),
          (mode) => {
            // Save the mode
            saveSyncMode(mode)
            
            // Load it back
            const loaded = loadSyncMode()
            
            // Should match
            expect(loaded).toBe(mode)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should default to word mode when localStorage is empty', () => {
      // Don't save anything
      const loaded = loadSyncMode()
      
      // Should default to 'word'
      expect(loaded).toBe('word')
    })

    it('should handle invalid stored values gracefully', () => {
      // Store an invalid value
      localStorage.setItem('lyrics-sync-mode', 'invalid-mode')
      
      const loaded = loadSyncMode()
      
      // Should default to 'word'
      expect(loaded).toBe('word')
    })

    it('should persist mode across multiple save/load cycles', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom<SyncMode>('word', 'line'), { minLength: 1, maxLength: 10 }),
          (modes) => {
            for (const mode of modes) {
              saveSyncMode(mode)
              const loaded = loadSyncMode()
              expect(loaded).toBe(mode)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw an error
      const originalSetItem = Storage.prototype.setItem
      const originalGetItem = Storage.prototype.getItem
      
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded')
      })
      
      Storage.prototype.getItem = jest.fn(() => {
        throw new Error('Storage access denied')
      })
      
      try {
        // Should not throw
        saveSyncMode('line')
        const loaded = loadSyncMode()
        
        // Should default to 'word' when storage fails
        expect(loaded).toBe('word')
      } finally {
        // Restore original methods
        Storage.prototype.setItem = originalSetItem
        Storage.prototype.getItem = originalGetItem
      }
    })

    it('should maintain mode persistence across different modes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<SyncMode>('word', 'line'),
          fc.constantFrom<SyncMode>('word', 'line'),
          (mode1, mode2) => {
            // Save first mode
            saveSyncMode(mode1)
            expect(loadSyncMode()).toBe(mode1)
            
            // Save second mode
            saveSyncMode(mode2)
            expect(loadSyncMode()).toBe(mode2)
            
            // Verify it's the second mode
            expect(loadSyncMode()).toBe(mode2)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle rapid save/load operations', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom<SyncMode>('word', 'line'), { minLength: 1, maxLength: 20 }),
          (modes) => {
            // Rapidly save and load
            for (const mode of modes) {
              saveSyncMode(mode)
            }
            
            // Final load should return the last saved mode
            const loaded = loadSyncMode()
            expect(loaded).toBe(modes[modes.length - 1])
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should preserve mode when localStorage contains other keys', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<SyncMode>('word', 'line'),
          fc.string({ minLength: 1, maxLength: 20 }),
          (mode, otherValue) => {
            // Store other data
            localStorage.setItem('other-key', otherValue)
            
            // Save sync mode
            saveSyncMode(mode)
            
            // Load sync mode
            const loaded = loadSyncMode()
            
            // Should still have the correct mode
            expect(loaded).toBe(mode)
            
            // Other data should be preserved
            expect(localStorage.getItem('other-key')).toBe(otherValue)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('Sync mode storage edge cases', () => {
    it('should handle empty string in localStorage', () => {
      localStorage.setItem('lyrics-sync-mode', '')
      const loaded = loadSyncMode()
      expect(loaded).toBe('word')
    })

    it('should handle null value in localStorage', () => {
      localStorage.setItem('lyrics-sync-mode', 'null')
      const loaded = loadSyncMode()
      expect(loaded).toBe('word')
    })

    it('should handle case-sensitive mode values', () => {
      localStorage.setItem('lyrics-sync-mode', 'WORD')
      const loaded = loadSyncMode()
      expect(loaded).toBe('word') // Should default since 'WORD' !== 'word'
    })

    it('should handle whitespace in stored values', () => {
      localStorage.setItem('lyrics-sync-mode', ' word ')
      const loaded = loadSyncMode()
      expect(loaded).toBe('word') // Should default since ' word ' !== 'word'
    })

    it('should handle very long invalid values', () => {
      const longValue = 'a'.repeat(10000)
      localStorage.setItem('lyrics-sync-mode', longValue)
      const loaded = loadSyncMode()
      expect(loaded).toBe('word')
    })

    it('should handle special characters in storage', () => {
      localStorage.setItem('lyrics-sync-mode', 'word\n\t\r')
      const loaded = loadSyncMode()
      expect(loaded).toBe('word') // Should default since value contains special chars
    })

    it('should handle JSON-like values', () => {
      localStorage.setItem('lyrics-sync-mode', '{"mode":"word"}')
      const loaded = loadSyncMode()
      expect(loaded).toBe('word') // Should default since it's not a valid mode string
    })
  })
})
