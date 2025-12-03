/**
 * Property-based tests for offset storage utilities
 * Using fast-check for property-based testing
 * 
 * **Feature: song-playback-improvements, Property 7: Offset persistence round-trip**
 * **Validates: Requirements 2.3, 2.4, 12.1, 12.2**
 * 
 * **Feature: song-playback-improvements, Property 8: Offset storage LRU eviction**
 * **Validates: Requirements 12.3**
 */
import * as fc from 'fast-check'
import {
  saveOffset,
  loadOffset,
  applyLruEviction,
  clearOffsetStorage,
  getOffsetEntryCount,
  MAX_OFFSET_ENTRIES,
  DEFAULT_OFFSET,
  type OffsetStorage,
  type OffsetEntry,
} from '@/lib/offset-storage'

/**
 * Generator for valid song IDs (non-empty strings)
 */
const songIdArbitrary = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0)

/**
 * Generator for valid offset values within the allowed range
 */
const offsetArbitrary = fc.integer({ min: -2000, max: 2000 })

/**
 * Generator for a single offset entry
 */
const offsetEntryArbitrary = fc.record({
  offset: offsetArbitrary,
  updatedAt: fc.integer({ min: 0, max: Date.now() + 1000000 }),
})

/**
 * Generator for offset storage with a specific number of entries
 */
const offsetStorageArbitrary = (minSize: number = 0, maxSize: number = 60): fc.Arbitrary<OffsetStorage> =>
  fc.array(
    fc.tuple(songIdArbitrary, offsetEntryArbitrary),
    { minLength: minSize, maxLength: maxSize }
  ).map(entries => {
    const storage: OffsetStorage = {}
    for (const [songId, entry] of entries) {
      storage[songId] = entry
    }
    return storage
  })

describe('Offset Storage Property Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    jest.clearAllMocks()
  })


  /**
   * **Feature: song-playback-improvements, Property 7: Offset persistence round-trip**
   * **Validates: Requirements 2.3, 2.4, 12.1, 12.2**
   * 
   * For any offset value saved to localStorage for a song_id,
   * loading that song should restore the same offset value.
   */
  describe('Property 7: Offset persistence round-trip', () => {
    it('should return the same offset value after save and load', () => {
      fc.assert(
        fc.property(
          songIdArbitrary,
          offsetArbitrary,
          (songId, offset) => {
            // Clear storage before each iteration
            clearOffsetStorage()
            
            // Save the offset
            saveOffset(songId, offset)
            
            // Load the offset
            const loaded = loadOffset(songId)
            
            // Should return the same value
            expect(loaded).toBe(offset)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist multiple song offsets independently', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(songIdArbitrary, offsetArbitrary),
            { minLength: 2, maxLength: 10 }
          ),
          (songOffsets) => {
            // Clear storage before each iteration
            clearOffsetStorage()
            
            // Create unique song IDs by appending index
            const uniqueSongOffsets = songOffsets.map(([songId, offset], index) => 
              [`${songId}_${index}`, offset] as const
            )
            
            // Save all offsets
            for (const [songId, offset] of uniqueSongOffsets) {
              saveOffset(songId, offset)
            }
            
            // Load and verify each offset
            for (const [songId, offset] of uniqueSongOffsets) {
              const loaded = loadOffset(songId)
              expect(loaded).toBe(offset)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return default offset for non-existent song', () => {
      fc.assert(
        fc.property(
          songIdArbitrary,
          (songId) => {
            // Clear storage before each iteration
            clearOffsetStorage()
            
            // Load without saving
            const loaded = loadOffset(songId)
            
            // Should return default
            expect(loaded).toBe(DEFAULT_OFFSET)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should overwrite previous offset for same song', () => {
      fc.assert(
        fc.property(
          songIdArbitrary,
          offsetArbitrary,
          offsetArbitrary,
          (songId, firstOffset, secondOffset) => {
            // Clear storage before each iteration
            clearOffsetStorage()
            
            // Save first offset
            saveOffset(songId, firstOffset)
            
            // Save second offset (overwrite)
            saveOffset(songId, secondOffset)
            
            // Load should return second offset
            const loaded = loadOffset(songId)
            expect(loaded).toBe(secondOffset)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle empty song ID gracefully', () => {
      // Empty string should not save and should return default
      saveOffset('', 100)
      const loaded = loadOffset('')
      expect(loaded).toBe(DEFAULT_OFFSET)
    })
  })


  /**
   * **Feature: song-playback-improvements, Property 8: Offset storage LRU eviction**
   * **Validates: Requirements 12.3**
   * 
   * For any offset storage with more than 50 entries, the oldest entries
   * (by updatedAt) should be removed to maintain the 50-entry limit.
   */
  describe('Property 8: Offset storage LRU eviction', () => {
    it('should not evict when entries are at or below limit', () => {
      fc.assert(
        fc.property(
          offsetStorageArbitrary(0, MAX_OFFSET_ENTRIES),
          (storage) => {
            const result = applyLruEviction(storage)
            
            // Should have same number of entries
            expect(Object.keys(result).length).toBe(Object.keys(storage).length)
            
            // All original entries should be present
            for (const songId of Object.keys(storage)) {
              expect(result[songId]).toBeDefined()
              expect(result[songId].offset).toBe(storage[songId].offset)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should evict oldest entries when over limit', () => {
      fc.assert(
        fc.property(
          offsetStorageArbitrary(MAX_OFFSET_ENTRIES + 1, MAX_OFFSET_ENTRIES + 20),
          (storage) => {
            const result = applyLruEviction(storage)
            
            // Should have exactly MAX_OFFSET_ENTRIES
            expect(Object.keys(result).length).toBe(MAX_OFFSET_ENTRIES)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should keep the most recently updated entries', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: MAX_OFFSET_ENTRIES + 1, max: MAX_OFFSET_ENTRIES + 10 }),
          (numEntries) => {
            // Create storage with sequential timestamps
            const storage: OffsetStorage = {}
            for (let i = 0; i < numEntries; i++) {
              storage[`song_${i}`] = {
                offset: i * 10,
                updatedAt: i * 1000, // Sequential timestamps
              }
            }
            
            const result = applyLruEviction(storage)
            
            // Should have exactly MAX_OFFSET_ENTRIES
            expect(Object.keys(result).length).toBe(MAX_OFFSET_ENTRIES)
            
            // The oldest entries (lowest timestamps) should be removed
            // The newest entries should be kept
            const expectedKeptStart = numEntries - MAX_OFFSET_ENTRIES
            for (let i = expectedKeptStart; i < numEntries; i++) {
              expect(result[`song_${i}`]).toBeDefined()
            }
            
            // The oldest entries should be removed
            for (let i = 0; i < expectedKeptStart; i++) {
              expect(result[`song_${i}`]).toBeUndefined()
            }
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should handle entries with same timestamp', () => {
      // Create storage with same timestamp for all entries
      const storage: OffsetStorage = {}
      const sameTimestamp = Date.now()
      for (let i = 0; i < MAX_OFFSET_ENTRIES + 5; i++) {
        storage[`song_${i}`] = {
          offset: i * 10,
          updatedAt: sameTimestamp,
        }
      }
      
      const result = applyLruEviction(storage)
      
      // Should have exactly MAX_OFFSET_ENTRIES
      expect(Object.keys(result).length).toBe(MAX_OFFSET_ENTRIES)
    })

    it('should handle entries with missing updatedAt', () => {
      // Create storage with some entries missing updatedAt
      const storage: OffsetStorage = {}
      for (let i = 0; i < MAX_OFFSET_ENTRIES + 5; i++) {
        storage[`song_${i}`] = {
          offset: i * 10,
          updatedAt: i < 3 ? 0 : Date.now() + i, // First 3 have 0 (treated as oldest)
        } as OffsetEntry
      }
      
      const result = applyLruEviction(storage)
      
      // Should have exactly MAX_OFFSET_ENTRIES
      expect(Object.keys(result).length).toBe(MAX_OFFSET_ENTRIES)
      
      // Entries with 0 timestamp should be evicted first
      expect(result['song_0']).toBeUndefined()
      expect(result['song_1']).toBeUndefined()
    })

    it('should preserve offset values during eviction', () => {
      fc.assert(
        fc.property(
          offsetStorageArbitrary(MAX_OFFSET_ENTRIES + 1, MAX_OFFSET_ENTRIES + 10),
          (storage) => {
            const result = applyLruEviction(storage)
            
            // All kept entries should have their original offset values
            for (const songId of Object.keys(result)) {
              expect(result[songId].offset).toBe(storage[songId].offset)
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  describe('Integration: saveOffset triggers LRU eviction', () => {
    it('should maintain max entries when saving many offsets', () => {
      // Clear storage
      clearOffsetStorage()
      
      // Save more than MAX_OFFSET_ENTRIES
      for (let i = 0; i < MAX_OFFSET_ENTRIES + 10; i++) {
        saveOffset(`song_${i}`, i * 10)
      }
      
      // Should have at most MAX_OFFSET_ENTRIES
      const count = getOffsetEntryCount()
      expect(count).toBeLessThanOrEqual(MAX_OFFSET_ENTRIES)
    })
  })
})
