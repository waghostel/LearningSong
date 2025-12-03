/**
 * Unit tests for offset storage utilities
 * 
 * Tests cover:
 * - Save/load offset functionality
 * - LRU eviction behavior
 * - Invalid data handling
 * - Storage full handling
 * 
 * **Feature: song-playback-improvements**
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.4**
 */
import {
  saveOffset,
  loadOffset,
  loadStorage,
  applyLruEviction,
  clearOffsetStorage,
  getOffsetEntryCount,
  MAX_OFFSET_ENTRIES,
  DEFAULT_OFFSET,
  OFFSET_STORAGE_KEY,
  type OffsetStorage,
} from '@/lib/offset-storage'

describe('Offset Storage Unit Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    jest.clearAllMocks()
  })

  describe('saveOffset and loadOffset', () => {
    it('should save and load a positive offset', () => {
      saveOffset('song-123', 500)
      expect(loadOffset('song-123')).toBe(500)
    })

    it('should save and load a negative offset', () => {
      saveOffset('song-456', -300)
      expect(loadOffset('song-456')).toBe(-300)
    })

    it('should save and load zero offset', () => {
      saveOffset('song-789', 0)
      expect(loadOffset('song-789')).toBe(0)
    })

    it('should return default offset for non-existent song', () => {
      expect(loadOffset('non-existent-song')).toBe(DEFAULT_OFFSET)
    })

    it('should overwrite existing offset', () => {
      saveOffset('song-123', 100)
      saveOffset('song-123', 200)
      expect(loadOffset('song-123')).toBe(200)
    })


    it('should handle multiple songs independently', () => {
      saveOffset('song-1', 100)
      saveOffset('song-2', 200)
      saveOffset('song-3', -150)
      
      expect(loadOffset('song-1')).toBe(100)
      expect(loadOffset('song-2')).toBe(200)
      expect(loadOffset('song-3')).toBe(-150)
    })

    it('should not save with empty song ID', () => {
      saveOffset('', 100)
      expect(loadOffset('')).toBe(DEFAULT_OFFSET)
    })
  })

  describe('LRU eviction', () => {
    it('should not evict when under limit', () => {
      // Save 10 entries
      for (let i = 0; i < 10; i++) {
        saveOffset(`song-${i}`, i * 10)
      }
      
      expect(getOffsetEntryCount()).toBe(10)
      
      // All entries should be accessible
      for (let i = 0; i < 10; i++) {
        expect(loadOffset(`song-${i}`)).toBe(i * 10)
      }
    })

    it('should evict oldest entries when over limit', () => {
      // Save MAX_OFFSET_ENTRIES + 5 entries
      for (let i = 0; i < MAX_OFFSET_ENTRIES + 5; i++) {
        saveOffset(`song-${i}`, i * 10)
      }
      
      // Should have at most MAX_OFFSET_ENTRIES
      expect(getOffsetEntryCount()).toBeLessThanOrEqual(MAX_OFFSET_ENTRIES)
    })

    it('should keep most recently accessed entries', () => {
      // Save MAX_OFFSET_ENTRIES entries
      for (let i = 0; i < MAX_OFFSET_ENTRIES; i++) {
        saveOffset(`song-${i}`, i * 10)
      }
      
      // Access the first entry to update its timestamp
      loadOffset('song-0')
      
      // Save 5 more entries to trigger eviction
      for (let i = MAX_OFFSET_ENTRIES; i < MAX_OFFSET_ENTRIES + 5; i++) {
        saveOffset(`song-${i}`, i * 10)
      }
      
      // song-0 should still be accessible (was recently accessed)
      expect(loadOffset('song-0')).toBe(0)
    })

    it('should apply LRU eviction correctly', () => {
      const storage: OffsetStorage = {}
      
      // Create entries with sequential timestamps
      for (let i = 0; i < MAX_OFFSET_ENTRIES + 10; i++) {
        storage[`song-${i}`] = {
          offset: i * 10,
          updatedAt: i * 1000, // Sequential timestamps
        }
      }
      
      const result = applyLruEviction(storage)
      
      // Should have exactly MAX_OFFSET_ENTRIES
      expect(Object.keys(result).length).toBe(MAX_OFFSET_ENTRIES)
      
      // Oldest entries should be removed
      expect(result['song-0']).toBeUndefined()
      expect(result['song-9']).toBeUndefined()
      
      // Newest entries should be kept
      expect(result[`song-${MAX_OFFSET_ENTRIES + 9}`]).toBeDefined()
    })
  })


  describe('Invalid data handling', () => {
    it('should return default offset for corrupted JSON', () => {
      localStorage.setItem(OFFSET_STORAGE_KEY, 'not valid json')
      expect(loadOffset('any-song')).toBe(DEFAULT_OFFSET)
    })

    it('should return default offset for null storage', () => {
      localStorage.setItem(OFFSET_STORAGE_KEY, 'null')
      expect(loadOffset('any-song')).toBe(DEFAULT_OFFSET)
    })

    it('should return default offset for array storage', () => {
      localStorage.setItem(OFFSET_STORAGE_KEY, '[]')
      expect(loadOffset('any-song')).toBe(DEFAULT_OFFSET)
    })

    it('should return default offset for invalid entry structure', () => {
      localStorage.setItem(OFFSET_STORAGE_KEY, JSON.stringify({
        'song-123': 'not an object',
      }))
      expect(loadOffset('song-123')).toBe(DEFAULT_OFFSET)
    })

    it('should return default offset for entry with non-number offset', () => {
      localStorage.setItem(OFFSET_STORAGE_KEY, JSON.stringify({
        'song-123': { offset: 'not a number', updatedAt: Date.now() },
      }))
      expect(loadOffset('song-123')).toBe(DEFAULT_OFFSET)
    })

    it('should handle loadStorage with corrupted data', () => {
      localStorage.setItem(OFFSET_STORAGE_KEY, 'corrupted')
      const storage = loadStorage()
      expect(storage).toEqual({})
    })
  })

  describe('Storage full handling', () => {
    it('should handle localStorage setItem error gracefully', () => {
      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      
      // Should not throw
      expect(() => saveOffset('song-123', 100)).not.toThrow()
      
      // Restore original
      localStorage.setItem = originalSetItem
    })

    it('should handle localStorage getItem error gracefully', () => {
      // Mock localStorage.getItem to throw
      const originalGetItem = localStorage.getItem
      localStorage.getItem = jest.fn().mockImplementation(() => {
        throw new Error('SecurityError')
      })
      
      // Should return default offset
      expect(loadOffset('song-123')).toBe(DEFAULT_OFFSET)
      
      // Restore original
      localStorage.getItem = originalGetItem
    })

    it('should handle localStorage removeItem error gracefully', () => {
      // Mock localStorage.removeItem to throw
      const originalRemoveItem = localStorage.removeItem
      localStorage.removeItem = jest.fn().mockImplementation(() => {
        throw new Error('SecurityError')
      })
      
      // Should not throw
      expect(() => clearOffsetStorage()).not.toThrow()
      
      // Restore original
      localStorage.removeItem = originalRemoveItem
    })
  })

  describe('clearOffsetStorage', () => {
    it('should clear all stored offsets', () => {
      saveOffset('song-1', 100)
      saveOffset('song-2', 200)
      
      clearOffsetStorage()
      
      expect(loadOffset('song-1')).toBe(DEFAULT_OFFSET)
      expect(loadOffset('song-2')).toBe(DEFAULT_OFFSET)
      expect(getOffsetEntryCount()).toBe(0)
    })
  })

  describe('getOffsetEntryCount', () => {
    it('should return 0 for empty storage', () => {
      expect(getOffsetEntryCount()).toBe(0)
    })

    it('should return correct count after saving', () => {
      saveOffset('song-1', 100)
      expect(getOffsetEntryCount()).toBe(1)
      
      saveOffset('song-2', 200)
      expect(getOffsetEntryCount()).toBe(2)
    })

    it('should not increase count when overwriting', () => {
      saveOffset('song-1', 100)
      saveOffset('song-1', 200)
      expect(getOffsetEntryCount()).toBe(1)
    })
  })
})
