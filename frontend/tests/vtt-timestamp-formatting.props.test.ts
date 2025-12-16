/**
 * Property-based tests for VTT timestamp formatting
 * 
 * **Feature: vtt-download-enhancement, Property 14: Millisecond padding consistency**
 * **Validates: Requirements 5.4**
 */

import * as fc from 'fast-check'
import { formatVttTimestamp } from '@/lib/vtt-generator'

describe('VTT Timestamp Formatting Property Tests', () => {
  /**
   * **Feature: vtt-download-enhancement, Property 14: Millisecond padding consistency**
   * **Validates: Requirements 5.4**
   * 
   * For any timestamp value, the formatted milliseconds component should always be 
   * exactly three digits, padding with leading zeros as necessary.
   */
  describe('Property 14: Millisecond padding consistency', () => {
    it('should always pad milliseconds to exactly 3 digits', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 3600, noNaN: true }),
          (seconds) => {
            const formatted = formatVttTimestamp(seconds)
            
            // Extract milliseconds part (after the last dot)
            const parts = formatted.split('.')
            expect(parts.length).toBe(2)
            
            const millisecondsPart = parts[1]
            
            // Should be exactly 3 digits
            expect(millisecondsPart.length).toBe(3)
            
            // Should be all digits
            expect(/^\d{3}$/.test(millisecondsPart)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should pad milliseconds with leading zeros when needed', () => {
      // Test specific cases where padding is required
      const testCases = [
        { seconds: 0.001, expectedMs: '001' },
        { seconds: 0.01, expectedMs: '010' },
        { seconds: 0.1, expectedMs: '100' },
        { seconds: 1.001, expectedMs: '001' },
        { seconds: 1.01, expectedMs: '010' },
        { seconds: 1.1, expectedMs: '100' },
        { seconds: 60.001, expectedMs: '001' },
        { seconds: 60.01, expectedMs: '010' },
        { seconds: 60.1, expectedMs: '100' },
      ]

      for (const { seconds, expectedMs } of testCases) {
        const formatted = formatVttTimestamp(seconds)
        const millisecondsPart = formatted.split('.')[1]
        expect(millisecondsPart).toBe(expectedMs)
      }
    })

    it('should handle fractional seconds with various decimal places', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (seconds) => {
            // Test with different levels of precision
            const precisions = [1, 2, 3, 4, 5, 6]
            
            for (const precision of precisions) {
              const roundedSeconds = Number(seconds.toFixed(precision))
              const formatted = formatVttTimestamp(roundedSeconds)
              
              const millisecondsPart = formatted.split('.')[1]
              
              // Should always be exactly 3 digits regardless of input precision
              expect(millisecondsPart.length).toBe(3)
              expect(/^\d{3}$/.test(millisecondsPart)).toBe(true)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle edge cases with very small fractional parts', () => {
      const edgeCases = [
        0.0001, // Should round to 000
        0.0005, // Should round to 001 (rounding up)
        0.0009, // Should round to 001
        0.999, // Should round to 999
        0.9999, // Should round to 1000, but clamped to 999
      ]

      for (const seconds of edgeCases) {
        const formatted = formatVttTimestamp(seconds)
        const millisecondsPart = formatted.split('.')[1]
        
        expect(millisecondsPart.length).toBe(3)
        expect(/^\d{3}$/.test(millisecondsPart)).toBe(true)
        
        // Milliseconds should be in valid range 000-999
        const msValue = parseInt(millisecondsPart, 10)
        expect(msValue).toBeGreaterThanOrEqual(0)
        expect(msValue).toBeLessThanOrEqual(999)
      }
    })

    it('should maintain consistency across different time ranges', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.float({ min: 0, max: 1, noNaN: true }), // Sub-second
            fc.float({ min: 1, max: 60, noNaN: true }), // Seconds
            fc.float({ min: 60, max: 3600, noNaN: true }), // Minutes
            fc.float({ min: 3600, max: 7200, noNaN: true }) // Hours
          ),
          (seconds) => {
            const formatted = formatVttTimestamp(seconds)
            const millisecondsPart = formatted.split('.')[1]
            
            // Consistency check: all timestamps should have 3-digit milliseconds
            expect(millisecondsPart.length).toBe(3)
            expect(/^\d{3}$/.test(millisecondsPart)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle rounding correctly for millisecond precision', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (baseSeconds) => {
            // Add very small fractional parts that test rounding
            const testValues = [
              baseSeconds + 0.0001, // Should round down
              baseSeconds + 0.0005, // Should round up
              baseSeconds + 0.0009, // Should round up
            ]

            for (const seconds of testValues) {
              const formatted = formatVttTimestamp(seconds)
              const millisecondsPart = formatted.split('.')[1]
              
              expect(millisecondsPart.length).toBe(3)
              
              // Verify the milliseconds are properly rounded
              const expectedMs = Math.round((seconds % 1) * 1000) % 1000
              const actualMs = parseInt(millisecondsPart, 10)
              
              expect(actualMs).toBe(expectedMs)
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})