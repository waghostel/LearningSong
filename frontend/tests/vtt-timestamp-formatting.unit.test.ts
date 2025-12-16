/**
 * Unit tests for VTT timestamp formatting
 * 
 * **Feature: vtt-download-enhancement**
 * **Task 7.2: Write unit tests for timestamp formatting**
 * **Requirements: 5.1, 5.4, 5.5**
 */

import { formatVttTimestamp, validateVttTimestamp } from '@/lib/vtt-generator'

describe('VTT Timestamp Formatting Unit Tests', () => {
  
  describe('Basic timestamp formatting', () => {
    it('should format zero seconds correctly', () => {
      expect(formatVttTimestamp(0)).toBe('00:00.000')
    })

    it('should format sub-second values correctly', () => {
      expect(formatVttTimestamp(0.1)).toBe('00:00.100')
      expect(formatVttTimestamp(0.01)).toBe('00:00.010')
      expect(formatVttTimestamp(0.001)).toBe('00:00.001')
      expect(formatVttTimestamp(0.5)).toBe('00:00.500')
      expect(formatVttTimestamp(0.999)).toBe('00:00.999')
    })

    it('should format seconds correctly', () => {
      expect(formatVttTimestamp(1)).toBe('00:01.000')
      expect(formatVttTimestamp(30)).toBe('00:30.000')
      expect(formatVttTimestamp(59)).toBe('00:59.000')
      expect(formatVttTimestamp(59.999)).toBe('00:59.999')
    })

    it('should format minutes correctly', () => {
      expect(formatVttTimestamp(60)).toBe('01:00.000')
      expect(formatVttTimestamp(90)).toBe('01:30.000')
      expect(formatVttTimestamp(3599)).toBe('59:59.000')
      expect(formatVttTimestamp(3599.999)).toBe('59:59.999')
    })

    it('should format hours correctly', () => {
      expect(formatVttTimestamp(3600)).toBe('01:00:00.000')
      expect(formatVttTimestamp(3661)).toBe('01:01:01.000')
      expect(formatVttTimestamp(7200)).toBe('02:00:00.000')
      expect(formatVttTimestamp(3665.5)).toBe('01:01:05.500')
    })
  })

  describe('Millisecond padding', () => {
    it('should pad milliseconds to 3 digits', () => {
      expect(formatVttTimestamp(1.1)).toBe('00:01.100')
      expect(formatVttTimestamp(1.01)).toBe('00:01.010')
      expect(formatVttTimestamp(1.001)).toBe('00:01.001')
    })

    it('should handle rounding of milliseconds', () => {
      // Test rounding behavior - improved implementation
      expect(formatVttTimestamp(1.0001)).toBe('00:01.000') // Rounds down
      expect(formatVttTimestamp(1.0005)).toBe('00:01.001') // Rounds up (0.5 rounds up)
      expect(formatVttTimestamp(1.0009)).toBe('00:01.001') // Rounds up
    })

    it('should handle millisecond overflow correctly', () => {
      // Improved implementation - when milliseconds round to 1000, they should carry over to seconds
      expect(formatVttTimestamp(0.9995)).toBe('00:01.000') // Rounds to 1000ms, carries over to 1 second
      expect(formatVttTimestamp(59.9995)).toBe('01:00.000') // Rounds to 1000ms, carries over to 1 minute
    })
  })

  describe('WebVTT format compliance', () => {
    it('should use correct separator for timestamps', () => {
      const formatted = formatVttTimestamp(65.5)
      expect(formatted).toContain(':')
      expect(formatted).toContain('.')
      expect(formatted).toBe('01:05.500')
    })

    it('should not include hours when less than 1 hour', () => {
      expect(formatVttTimestamp(3599.999)).toBe('59:59.999')
      expect(formatVttTimestamp(3599.999)).not.toMatch(/^\d{2}:\d{2}:\d{2}/)
    })

    it('should include hours when 1 hour or more', () => {
      expect(formatVttTimestamp(3600)).toBe('01:00:00.000')
      expect(formatVttTimestamp(3600)).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/)
    })

    it('should pad all time components to 2 digits', () => {
      expect(formatVttTimestamp(5)).toBe('00:05.000')
      expect(formatVttTimestamp(65)).toBe('01:05.000')
      expect(formatVttTimestamp(3665)).toBe('01:01:05.000')
    })
  })

  describe('Edge cases and boundary values', () => {
    it('should handle zero time', () => {
      expect(formatVttTimestamp(0)).toBe('00:00.000')
    })

    it('should handle large time values', () => {
      expect(formatVttTimestamp(36000)).toBe('10:00:00.000') // 10 hours
      expect(formatVttTimestamp(359999)).toBe('99:59:59.000') // 99+ hours
    })

    it('should handle fractional seconds with high precision', () => {
      expect(formatVttTimestamp(1.123456789)).toBe('00:01.123')
      expect(formatVttTimestamp(1.987654321)).toBe('00:01.988')
    })

    it('should handle very small positive values', () => {
      expect(formatVttTimestamp(0.0001)).toBe('00:00.000')
      expect(formatVttTimestamp(0.0005)).toBe('00:00.001')
    })
  })

  describe('Invalid input handling', () => {
    it('should handle NaN gracefully', () => {
      // The function should handle NaN without crashing
      expect(() => formatVttTimestamp(NaN)).not.toThrow()
    })

    it('should handle Infinity gracefully', () => {
      // The function should handle Infinity without crashing
      expect(() => formatVttTimestamp(Infinity)).not.toThrow()
      expect(() => formatVttTimestamp(-Infinity)).not.toThrow()
    })

    it('should handle negative values gracefully', () => {
      // The function should handle negative values without crashing
      expect(() => formatVttTimestamp(-1)).not.toThrow()
      expect(() => formatVttTimestamp(-0.5)).not.toThrow()
    })
  })

  describe('Consistency with WebVTT standard', () => {
    it('should match WebVTT timestamp pattern for minutes format', () => {
      const pattern = /^\d{2}:\d{2}\.\d{3}$/
      expect(formatVttTimestamp(0)).toMatch(pattern)
      expect(formatVttTimestamp(65.5)).toMatch(pattern)
      expect(formatVttTimestamp(3599.999)).toMatch(pattern)
    })

    it('should match WebVTT timestamp pattern for hours format', () => {
      const pattern = /^\d{2}:\d{2}:\d{2}\.\d{3}$/
      expect(formatVttTimestamp(3600)).toMatch(pattern)
      expect(formatVttTimestamp(3665.5)).toMatch(pattern)
      expect(formatVttTimestamp(36000)).toMatch(pattern)
    })

    it('should produce timestamps that can be used in VTT cue timing', () => {
      // Test that formatted timestamps would be valid in a VTT cue line
      const start = formatVttTimestamp(10.5)
      const end = formatVttTimestamp(15.8)
      const cueLine = `${start} --> ${end}`
      
      expect(cueLine).toBe('00:10.500 --> 00:15.800')
      expect(cueLine).toMatch(/^\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}\.\d{3}$/)
    })
  })

  describe('Performance and precision', () => {
    it('should handle rapid successive calls consistently', () => {
      const testValue = 123.456
      const results = []
      
      // Call the function multiple times rapidly
      for (let i = 0; i < 100; i++) {
        results.push(formatVttTimestamp(testValue))
      }
      
      // All results should be identical
      const expected = '02:03.456'
      results.forEach(result => {
        expect(result).toBe(expected)
      })
    })

    it('should maintain precision across different magnitudes', () => {
      const testCases = [
        { input: 0.123, expected: '00:00.123' },
        { input: 12.123, expected: '00:12.123' },
        { input: 123.123, expected: '02:03.123' },
        { input: 1234.123, expected: '20:34.123' },
        { input: 12345.123, expected: '03:25:45.123' },
      ]

      testCases.forEach(({ input, expected }) => {
        expect(formatVttTimestamp(input)).toBe(expected)
      })
    })
  })

  describe('Timestamp validation', () => {
    it('should validate correct WebVTT timestamp formats', () => {
      const validTimestamps = [
        '00:00.000',
        '01:23.456',
        '59:59.999',
        '01:00:00.000',
        '12:34:56.789',
        '99:59:59.999',
      ]

      validTimestamps.forEach(timestamp => {
        expect(validateVttTimestamp(timestamp)).toBe(true)
      })
    })

    it('should reject invalid timestamp formats', () => {
      const invalidTimestamps = [
        '',
        'invalid',
        '1:23.456', // Missing leading zero
        '01:23', // Missing milliseconds
        '01:23.45', // Wrong millisecond length
        '01:23.4567', // Too many millisecond digits
        '01:60.000', // Invalid seconds
        '60:00.000', // Invalid minutes (in MM:SS format)
        '01:60:00.000', // Invalid minutes (in HH:MM:SS format)
        '01:23:60.000', // Invalid seconds (in HH:MM:SS format)
        '01:23.1000', // Invalid milliseconds
        '-01:23.456', // Negative time
        '01:-23.456', // Negative component
      ]

      invalidTimestamps.forEach(timestamp => {
        expect(validateVttTimestamp(timestamp)).toBe(false)
      })
    })

    it('should reject non-string inputs', () => {
      const nonStringInputs = [
        null,
        undefined,
        123,
        {},
        [],
        true,
      ]

      nonStringInputs.forEach(input => {
        expect(validateVttTimestamp(input as any)).toBe(false)
      })
    })

    it('should validate timestamps generated by formatVttTimestamp', () => {
      const testValues = [0, 0.5, 1, 60, 3600, 3665.5, 12345.678]
      
      testValues.forEach(seconds => {
        const formatted = formatVttTimestamp(seconds)
        expect(validateVttTimestamp(formatted)).toBe(true)
      })
    })
  })
})