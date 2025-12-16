import * as fc from 'fast-check'
import { generateVttFilename } from '@/lib/vtt-generator'
import '@testing-library/jest-dom'

/**
 * Property-based tests for VTT filename generation
 * 
 * **Feature: vtt-download-enhancement**
 * **Validates: Requirements 2.5, 5.2, 5.3**
 */
describe('VTT Filename Generation Properties', () => {
  
  // Valid date range for all tests - filter out invalid dates
  const validDateArbitrary = fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
    .filter(d => !isNaN(d.getTime()))

  /**
   * **Feature: vtt-download-enhancement, Property 8: VTT filename format consistency**
   * **Validates: Requirements 2.5, 5.2**
   * 
   * For any song style and creation date, the generated filename should follow
   * the exact format "song-{normalized-style}-{YYYY-MM-DD}.vtt"
   */
  describe('Property 8: VTT filename format consistency', () => {
    it('should generate filenames following the standard format', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          validDateArbitrary,
          (style, date) => {
            const filename = generateVttFilename(style, date)
            const dateStr = date.toISOString().split('T')[0]
            
            expect(filename).toMatch(/^song-.*-.*\.vtt$/)
            expect(filename).toContain(dateStr)
            expect(filename.endsWith('.vtt')).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should always start with "song-" prefix', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          validDateArbitrary,
          (style, date) => {
            const filename = generateVttFilename(style, date)
            expect(filename.startsWith('song-')).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should always end with ".vtt" extension', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          validDateArbitrary,
          (style, date) => {
            const filename = generateVttFilename(style, date)
            expect(filename.endsWith('.vtt')).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include date in YYYY-MM-DD format', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          validDateArbitrary,
          (style, date) => {
            const filename = generateVttFilename(style, date)
            const dateStr = date.toISOString().split('T')[0]
            
            expect(filename).toContain(dateStr)
            const datePattern = /\d{4}-\d{2}-\d{2}/
            expect(filename).toMatch(datePattern)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should produce valid filenames for common music styles', () => {
      const commonStyles = ['Pop', 'Rap', 'Folk', 'Electronic', 'Rock', 'Jazz', "Children's", 'Classical']
      
      for (const style of commonStyles) {
        const date = new Date('2024-12-15')
        const filename = generateVttFilename(style, date)
        
        expect(filename).toMatch(/^song-[a-z0-9-]+-2024-12-15\.vtt$/)
        expect(filename).not.toContain('--')
      }
    })
  })

  /**
   * **Feature: vtt-download-enhancement, Property 13: Special character normalization in filenames**
   * **Validates: Requirements 5.3**
   * 
   * For any song style containing spaces or special characters, the filename
   * generation should replace all non-alphanumeric characters with hyphens.
   */
  describe('Property 13: Special character normalization in filenames', () => {
    it('should normalize special characters to hyphens', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom(' ', '!', '@', '#', '%', '^', '&', '*', '(', ')', '/', 'A', 'b', '1', '2'),
            { minLength: 1 }
          ).map(chars => chars.join('')),
          validDateArbitrary,
          (dirtyStyle, date) => {
            const filename = generateVttFilename(dirtyStyle, date)
            
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
        ),
        { numRuns: 100 }
      )
    })

    it('should convert uppercase letters to lowercase', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => /[A-Z]/.test(s)),
          validDateArbitrary,
          (style, date) => {
            const filename = generateVttFilename(style, date)
            
            const dateStr = date.toISOString().split('T')[0]
            const prefix = 'song-'
            const suffix = `-${dateStr}.vtt`
            const stylePart = filename.slice(prefix.length, filename.length - suffix.length)
            
            expect(stylePart).not.toMatch(/[A-Z]/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should replace spaces with hyphens', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('Pop', 'Rock', 'Jazz', 'Folk'), { minLength: 2, maxLength: 3 })
            .map(words => words.join(' ')),
          validDateArbitrary,
          (style, date) => {
            const filename = generateVttFilename(style, date)
            
            expect(filename).not.toContain(' ')
            expect(filename).toContain('-')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should not produce consecutive hyphens', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          validDateArbitrary,
          (style, date) => {
            const filename = generateVttFilename(style, date)
            expect(filename).not.toContain('--')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not start or end style part with hyphens', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          validDateArbitrary,
          (style, date) => {
            const filename = generateVttFilename(style, date)
            
            const dateStr = date.toISOString().split('T')[0]
            const prefix = 'song-'
            const suffix = `-${dateStr}.vtt`
            const stylePart = filename.slice(prefix.length, filename.length - suffix.length)
            
            if (stylePart !== 'unknown') {
              expect(stylePart.startsWith('-')).toBe(false)
              expect(stylePart.endsWith('-')).toBe(false)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty or whitespace-only styles with fallback', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', ' ', '  ', '\t', '\n', '   '),
          validDateArbitrary,
          (style, date) => {
            const filename = generateVttFilename(style, date)
            const dateStr = date.toISOString().split('T')[0]
            
            expect(filename).toBe(`song-unknown-${dateStr}.vtt`)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should handle styles with only special characters', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom('!', '@', '#', '%', '^', '&', '*'),
            { minLength: 1, maxLength: 5 }
          ).map(chars => chars.join('')),
          validDateArbitrary,
          (style, date) => {
            const filename = generateVttFilename(style, date)
            const dateStr = date.toISOString().split('T')[0]
            
            expect(filename).toBe(`song-unknown-${dateStr}.vtt`)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
