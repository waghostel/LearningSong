/**
 * Unit tests for VTT generator error scenarios
 * 
 * **Feature: vtt-download-enhancement**
 * **Task 6.5: Write unit tests for error scenarios**
 * **Requirements: 6.1, 6.2, 6.3, 6.4, 6.5**
 */

import {
  aggregateWordsToLines,
  generateVttContent,
  generateVttFilename,
  downloadVttFile,
  normalizeText,
  normalizeForMatching,
  type LineCue,
} from '@/lib/vtt-generator'
import type { AlignedWord } from '@/types/lyrics'

// Mock DOM methods for download testing
const mockCreateElement = jest.fn()
const mockAppendChild = jest.fn()
const mockRemoveChild = jest.fn()
const mockClick = jest.fn()
const mockCreateObjectURL = jest.fn()
const mockRevokeObjectURL = jest.fn()

// Setup DOM mocks
beforeAll(() => {
  Object.defineProperty(document, 'createElement', {
    value: mockCreateElement,
    writable: true,
  })
  Object.defineProperty(document.body, 'appendChild', {
    value: mockAppendChild,
    writable: true,
  })
  Object.defineProperty(document.body, 'removeChild', {
    value: mockRemoveChild,
    writable: true,
  })
  Object.defineProperty(URL, 'createObjectURL', {
    value: mockCreateObjectURL,
    writable: true,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: mockRevokeObjectURL,
    writable: true,
  })
})

beforeEach(() => {
  jest.clearAllMocks()
  
  // Setup default mock implementations
  const mockElement = {
    setAttribute: jest.fn(),
    click: mockClick,
    style: {},
  }
  mockCreateElement.mockReturnValue(mockElement)
  mockCreateObjectURL.mockReturnValue('blob:mock-url')
})

describe('VTT Generator Error Scenarios Unit Tests', () => {
  
  describe('Malformed data handling', () => {
    it('should handle null aligned words', () => {
      const result = aggregateWordsToLines(null as any, 'test lyrics')
      expect(result).toEqual([])
    })

    it('should handle undefined aligned words', () => {
      const result = aggregateWordsToLines(undefined as any, 'test lyrics')
      expect(result).toEqual([])
    })

    it('should handle empty aligned words array', () => {
      const result = aggregateWordsToLines([], 'test lyrics')
      expect(result).toEqual([])
    })

    it('should handle null lyrics', () => {
      const alignedWords: AlignedWord[] = [
        { word: 'test', startS: 0, endS: 1, success: true, palign: 0 }
      ]
      const result = aggregateWordsToLines(alignedWords, null as any)
      expect(result).toEqual([])
    })

    it('should handle undefined lyrics', () => {
      const alignedWords: AlignedWord[] = [
        { word: 'test', startS: 0, endS: 1, success: true, palign: 0 }
      ]
      const result = aggregateWordsToLines(alignedWords, undefined as any)
      expect(result).toEqual([])
    })

    it('should handle empty lyrics string', () => {
      const alignedWords: AlignedWord[] = [
        { word: 'test', startS: 0, endS: 1, success: true, palign: 0 }
      ]
      const result = aggregateWordsToLines(alignedWords, '')
      expect(result).toEqual([])
    })

    it('should handle aligned words with missing properties', () => {
      const malformedWords = [
        { word: 'test' }, // Missing timing properties
        { startS: 0, endS: 1 }, // Missing word
        { word: 'valid', startS: 1, endS: 2, success: true, palign: 0 }
      ]
      
      expect(() => {
        const result = aggregateWordsToLines(malformedWords as any, 'test valid')
        expect(Array.isArray(result)).toBe(true)
      }).not.toThrow()
    })

    it('should handle aligned words with invalid timing values', () => {
      const invalidWords: AlignedWord[] = [
        { word: 'test1', startS: NaN, endS: 1, success: true, palign: 0 },
        { word: 'test2', startS: 0, endS: Infinity, success: true, palign: 0 },
        { word: 'test3', startS: -1, endS: 0.5, success: true, palign: 0 },
      ]
      
      expect(() => {
        const result = aggregateWordsToLines(invalidWords, 'test1 test2 test3')
        expect(Array.isArray(result)).toBe(true)
      }).not.toThrow()
    })
  })

  describe('Network failure scenarios', () => {
    it('should handle download failure gracefully', () => {
      // Mock a failure in createElement
      mockCreateElement.mockImplementation(() => {
        throw new Error('DOM manipulation failed')
      })

      // Should not throw, but should log error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      expect(() => {
        downloadVttFile('WEBVTT\n\ntest content', 'test.vtt')
      }).not.toThrow()
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle URL creation failure', () => {
      mockCreateObjectURL.mockImplementation(() => {
        throw new Error('URL creation failed')
      })

      // Should not throw, but should log error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      expect(() => {
        downloadVttFile('WEBVTT\n\ntest content', 'test.vtt')
      }).not.toThrow()
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle blob creation with invalid content', () => {
      expect(() => {
        downloadVttFile(null as any, 'test.vtt')
      }).not.toThrow()

      expect(() => {
        downloadVttFile(undefined as any, 'test.vtt')
      }).not.toThrow()
    })
  })

  describe('Browser compatibility fallbacks', () => {
    it('should handle missing URL.createObjectURL', () => {
      // Mock URL to not have createObjectURL
      const mockURL = { ...URL }
      delete (mockURL as any).createObjectURL
      
      // Temporarily replace global URL
      const originalURL = global.URL
      global.URL = mockURL as any

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      expect(() => {
        downloadVttFile('WEBVTT\n\ntest content', 'test.vtt')
      }).not.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith('Browser does not support file download')

      // Restore
      global.URL = originalURL
      consoleSpy.mockRestore()
    })

    it('should handle missing document.createElement', () => {
      // Test that the function handles cases where DOM methods might fail
      // This is more of an integration concern, so we'll test the error handling path
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      // Force an error by making createElement return null
      mockCreateElement.mockReturnValue(null)

      expect(() => {
        downloadVttFile('WEBVTT\n\ntest content', 'test.vtt')
      }).not.toThrow()

      consoleSpy.mockRestore()
    })

    it('should handle missing document.body', () => {
      const originalBody = document.body
      delete (document as any).body

      expect(() => {
        downloadVttFile('WEBVTT\n\ntest content', 'test.vtt')
      }).not.toThrow()

      // Restore
      Object.defineProperty(document, 'body', {
        value: originalBody,
        writable: true,
      })
    })
  })

  describe('VTT generation with malformed line cues', () => {
    it('should handle line cues with invalid text types', () => {
      const malformedCues = [
        { lineIndex: 0, text: null, startTime: 0, endTime: 1, isMarker: false },
        { lineIndex: 1, text: undefined, startTime: 1, endTime: 2, isMarker: false },
        { lineIndex: 2, text: 123, startTime: 2, endTime: 3, isMarker: false },
        { lineIndex: 3, text: 'valid', startTime: 3, endTime: 4, isMarker: false },
      ]

      const result = generateVttContent(malformedCues as any)
      expect(result).toContain('WEBVTT')
      expect(result).toContain('valid') // Should include valid cue
      expect(result).not.toContain('null')
      expect(result).not.toContain('undefined')
      expect(result).not.toContain('123')
    })

    it('should handle line cues with invalid timing types', () => {
      const malformedCues = [
        { lineIndex: 0, text: 'test1', startTime: 'invalid', endTime: 1, isMarker: false },
        { lineIndex: 1, text: 'test2', startTime: 0, endTime: 'invalid', isMarker: false },
        { lineIndex: 2, text: 'test3', startTime: null, endTime: null, isMarker: false },
        { lineIndex: 3, text: 'valid', startTime: 0, endTime: 1, isMarker: false },
      ]

      const result = generateVttContent(malformedCues as any)
      expect(result).toContain('WEBVTT')
      expect(result).toContain('valid') // Should include valid cue
    })

    it('should handle completely malformed line cues array', () => {
      const malformedInputs = [
        null,
        undefined,
        'string',
        123,
        {},
      ]

      for (const input of malformedInputs) {
        expect(() => {
          const result = generateVttContent(input as any)
          expect(typeof result).toBe('string')
          expect(result).toContain('WEBVTT')
        }).not.toThrow()
      }

      // Test array with malformed elements
      expect(() => {
        const result = generateVttContent([null, undefined, 'string'] as any)
        expect(typeof result).toBe('string')
        expect(result).toContain('WEBVTT')
      }).not.toThrow()
    })
  })

  describe('Filename generation edge cases', () => {
    it('should handle invalid date objects', () => {
      const invalidDates = [
        new Date('invalid-date'),
        new Date(NaN),
        new Date(''),
      ]

      for (const date of invalidDates) {
        const filename = generateVttFilename('Pop', date)
        expect(filename).toMatch(/^song-.+-unknown-date\.vtt$/)
      }
    })

    it('should handle null and undefined dates', () => {
      const filename1 = generateVttFilename('Pop', null as any)
      expect(filename1).toMatch(/^song-pop-unknown-date\.vtt$/)

      const filename2 = generateVttFilename('Pop', undefined as any)
      expect(filename2).toMatch(/^song-pop-unknown-date\.vtt$/)
    })

    it('should handle extreme style strings', () => {
      const extremeStyles = [
        '', // Empty
        '   ', // Whitespace only
        '!@#$%^&*()', // Special characters only
        'a'.repeat(1000), // Very long
        '中文测试', // Unicode
        'Style With Spaces And-Hyphens_Underscores',
      ]

      for (const style of extremeStyles) {
        expect(() => {
          const filename = generateVttFilename(style, new Date())
          expect(filename).toMatch(/\.vtt$/)
          expect(filename).toMatch(/^song-/)
        }).not.toThrow()
      }
    })

    it('should handle date objects that throw on toISOString', () => {
      const mockDate = {
        toISOString: () => {
          throw new Error('toISOString failed')
        },
        getTime: () => Date.now(),
      }

      expect(() => {
        const filename = generateVttFilename('Pop', mockDate as any)
        expect(filename).toMatch(/^song-pop-unknown-date\.vtt$/)
      }).not.toThrow()
    })
  })

  describe('Text normalization edge cases', () => {
    it('should handle null and undefined text in normalizeText', () => {
      expect(normalizeText(null as any)).toBe('')
      expect(normalizeText(undefined as any)).toBe('')
    })

    it('should handle non-string types in normalizeText', () => {
      expect(normalizeText(123 as any)).toBe('123')
      expect(normalizeText(true as any)).toBe('true')
      expect(normalizeText({} as any)).toBe('[object Object]')
    })

    it('should handle null and undefined text in normalizeForMatching', () => {
      expect(normalizeForMatching(null as any)).toBe('')
      expect(normalizeForMatching(undefined as any)).toBe('')
    })

    it('should handle non-string types in normalizeForMatching', () => {
      // normalizeForMatching converts to string then normalizes, so numbers become empty after normalization
      expect(normalizeForMatching(123 as any)).toBe('')
      expect(normalizeForMatching(true as any)).toBe('')
    })

    it('should handle extreme Unicode cases', () => {
      const extremeCases = [
        '\u0000\u0001\u0002', // Control characters
        '\uFEFF', // Byte order mark
        '🏳️‍🌈🏳️‍⚧️', // Complex emoji sequences
        'a\u0300\u0301\u0302', // Combining characters
        '\u200B\u200C\u200D', // Zero-width characters
      ]

      for (const text of extremeCases) {
        expect(() => {
          const normalized = normalizeText(text)
          const matching = normalizeForMatching(text)
          expect(typeof normalized).toBe('string')
          expect(typeof matching).toBe('string')
        }).not.toThrow()
      }
    })
  })

  describe('Memory and performance edge cases', () => {
    it('should handle very large lyrics text', () => {
      const largeText = 'word '.repeat(10000) // 50KB of text
      const alignedWords: AlignedWord[] = Array.from({ length: 100 }, (_, i) => ({
        word: 'word',
        startS: i,
        endS: i + 0.5,
        success: true,
        palign: 0,
      }))

      expect(() => {
        const result = aggregateWordsToLines(alignedWords, largeText)
        expect(Array.isArray(result)).toBe(true)
      }).not.toThrow()
    })

    it('should handle very large aligned words array', () => {
      const largeAlignedWords: AlignedWord[] = Array.from({ length: 10000 }, (_, i) => ({
        word: `word${i}`,
        startS: i * 0.1,
        endS: (i + 1) * 0.1,
        success: true,
        palign: 0,
      }))

      const lyrics = largeAlignedWords.map(w => w.word).slice(0, 100).join(' ')

      expect(() => {
        const result = aggregateWordsToLines(largeAlignedWords, lyrics)
        expect(Array.isArray(result)).toBe(true)
      }).not.toThrow()
    })

    it('should handle VTT generation with many line cues', () => {
      const manyLineCues: LineCue[] = Array.from({ length: 1000 }, (_, i) => ({
        lineIndex: i,
        text: `Line ${i}`,
        startTime: i,
        endTime: i + 0.5,
        isMarker: false,
      }))

      expect(() => {
        const result = generateVttContent(manyLineCues)
        expect(result).toContain('WEBVTT')
        expect(result.split('\n').length).toBeGreaterThan(1000)
      }).not.toThrow()
    })
  })
})