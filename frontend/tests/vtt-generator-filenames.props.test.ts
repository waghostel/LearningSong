import * as fc from 'fast-check'
import { generateVttFilename } from '@/lib/vtt-generator'
import '@testing-library/jest-dom'

/**
 * Property-based tests for VTT filename generation
 * 
 * **Feature: song-playback-improvements**
 * **Validates: Requirements 5.3**
 */
describe('VTT Filename Generation Properties', () => {
  
  /**
   * **Feature: song-playback-improvements, Property 8: VTT filename format consistency**
   * **Validates: Requirements 5.3**
   * 
   * Generated VTT filenames should always follow the format:
   * "song-{style}-{date}.vtt"
   */
  describe('Property 8: VTT filename format consistency', () => {
    it('should generate filenames following the standard format', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.date(),
          (style, date) => {
            const filename = generateVttFilename(style, date)
            const dateStr = date.toISOString().split('T')[0]
            
            expect(filename).toMatch(/^song-.*-.*\.vtt$/)
            expect(filename).toContain(dateStr)
            expect(filename.endsWith('.vtt')).toBe(true)
          }
        )
      )
    })
  })

  /**
   * **Feature: song-playback-improvements, Property 13: Special character normalization in filenames**
   * **Validates: Requirements 5.3**
   * 
   * Special characters in the song style should be normalized to hyphens.
   * Multiple hyphens should be collapsed.
   */
  describe('Property 13: Special character normalization in filenames', () => {
    it('should normalize special characters to hyphens', () => {
      fc.assert(
        fc.property(
          // Create strings with special characters
          fc.array(
            fc.constantFrom(' ', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '/', '\\', 'A', 'b', '1', '2'),
            { minLength: 1 }
          ).map(chars => chars.join('')),
          fc.date(),
          (dirtyStyle, date) => {
            const filename = generateVttFilename(dirtyStyle, date)
            
            // Should contain only lowercase letters, numbers, hyphens, and the standard parts
            const dateStr = date.toISOString().split('T')[0]
            const prefix = 'song-'
            const suffix = `-${dateStr}.vtt`
            
            const stylePart = filename.slice(prefix.length, filename.length - suffix.length)
            
            if (stylePart === 'unknown') {
              expect(filename).toBe(`song-unknown-${dateStr}.vtt`)
            } else {
              expect(stylePart).toMatch(/^[a-z0-9-]+$/)
              expect(stylePart).not.toContain('--')
              expect(stylePart.startsWith('-')).toBe(false)
              expect(stylePart.endsWith('-')).toBe(false)
            }
          }
        )
      )
    })
  })
})
