/**
 * Property-based tests for marker visibility persistence
 * Using fast-check for property-based testing
 * 
 * **Feature: song-playback-improvements, Property 21: Section marker visibility persistence**
 * **Validates: Requirements 14.4, 14.5**
 */
import * as fc from 'fast-check'
import { loadMarkerVisibility, saveMarkerVisibility } from '@/lib/marker-visibility'

describe('Marker Visibility Persistence Property Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  /**
   * **Feature: song-playback-improvements, Property 21: Section marker visibility persistence**
   * **Validates: Requirements 14.4, 14.5**
   * 
   * For any marker visibility preference saved to localStorage, loading the lyrics display
   * should restore the same visibility state.
   */
  describe('Property 21: Section marker visibility persistence', () => {
    it('should persist and restore marker visibility preference', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (showMarkers) => {
            // Save the preference
            saveMarkerVisibility(showMarkers)
            
            // Load the preference
            const loaded = loadMarkerVisibility()
            
            // Should match what was saved
            expect(loaded).toBe(showMarkers)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle multiple save/load cycles', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
          (values) => {
            // Save and load each value in sequence
            for (const value of values) {
              saveMarkerVisibility(value)
              const loaded = loadMarkerVisibility()
              expect(loaded).toBe(value)
            }
            
            // Final loaded value should be the last saved value
            const finalLoaded = loadMarkerVisibility()
            expect(finalLoaded).toBe(values[values.length - 1])
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return true as default when no preference is saved', () => {
      // Clear localStorage to ensure no preference exists
      localStorage.clear()
      
      const loaded = loadMarkerVisibility()
      
      // Default should be true (show markers)
      expect(loaded).toBe(true)
    })

    it('should handle localStorage errors gracefully', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (showMarkers) => {
            // Mock localStorage to throw an error
            const originalSetItem = Storage.prototype.setItem
            Storage.prototype.setItem = jest.fn(() => {
              throw new Error('Storage full')
            })
            
            // Should not throw when saving fails
            expect(() => saveMarkerVisibility(showMarkers)).not.toThrow()
            
            // Restore original setItem
            Storage.prototype.setItem = originalSetItem
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should handle corrupted localStorage data', () => {
      // Set invalid data in localStorage
      localStorage.setItem('lyrics-marker-visibility', 'invalid-value')
      
      // Should return false when data is not 'true' (any other string is treated as false)
      const loaded = loadMarkerVisibility()
      expect(loaded).toBe(false)
    })

    it('should preserve preference across multiple loads without saves', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (showMarkers) => {
            // Save once
            saveMarkerVisibility(showMarkers)
            
            // Load multiple times
            for (let i = 0; i < 5; i++) {
              const loaded = loadMarkerVisibility()
              expect(loaded).toBe(showMarkers)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should overwrite previous preference when saving new value', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.boolean(),
          (firstValue, secondValue) => {
            // Save first value
            saveMarkerVisibility(firstValue)
            
            // Save second value (overwrite)
            saveMarkerVisibility(secondValue)
            
            // Load should return second value
            const loaded = loadMarkerVisibility()
            expect(loaded).toBe(secondValue)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
