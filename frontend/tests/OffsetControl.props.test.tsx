/**
 * Property-based tests for OffsetControl component accessibility
 * Using fast-check for property-based testing
 * 
 * **Feature: song-playback-improvements, Property 16: Offset control accessibility**
 * **Validates: Requirements 11.1**
 */
import * as React from 'react'
import * as fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { OffsetControl } from '@/components/OffsetControl'
import { OFFSET_MIN, OFFSET_MAX, formatOffsetDisplay } from '@/lib/offset-utils'

describe('OffsetControl Accessibility Property Tests', () => {
  /**
   * **Feature: song-playback-improvements, Property 16: Offset control accessibility**
   * **Validates: Requirements 11.1**
   * 
   * For any rendered OffsetControl component, it should have aria-label,
   * aria-valuemin, aria-valuemax, and aria-valuenow attributes.
   */
  describe('Property 16: Offset control accessibility', () => {
    it('should have all required ARIA attributes for any valid offset', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: OFFSET_MIN, max: OFFSET_MAX }),
          (offset) => {
            const onChange = jest.fn()
            const { unmount } = render(
              <OffsetControl offset={offset} onChange={onChange} />
            )

            const slider = screen.getByTestId('offset-slider')

            // Check required ARIA attributes
            expect(slider).toHaveAttribute('aria-valuemin', String(OFFSET_MIN))
            expect(slider).toHaveAttribute('aria-valuemax', String(OFFSET_MAX))
            expect(slider).toHaveAttribute('aria-valuenow', String(offset))
            expect(slider).toHaveAttribute('aria-valuetext', formatOffsetDisplay(offset))
            expect(slider).toHaveAttribute('aria-label')

            // Clean up
            unmount()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should have aria-valuenow matching the current offset value', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: OFFSET_MIN, max: OFFSET_MAX }),
          (offset) => {
            const onChange = jest.fn()
            const { unmount } = render(
              <OffsetControl offset={offset} onChange={onChange} />
            )

            const slider = screen.getByTestId('offset-slider')
            const ariaValueNow = slider.getAttribute('aria-valuenow')

            expect(ariaValueNow).toBe(String(offset))

            unmount()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should have aria-valuetext with human-readable offset format', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: OFFSET_MIN, max: OFFSET_MAX }),
          (offset) => {
            const onChange = jest.fn()
            const { unmount } = render(
              <OffsetControl offset={offset} onChange={onChange} />
            )

            const slider = screen.getByTestId('offset-slider')
            const ariaValueText = slider.getAttribute('aria-valuetext')

            // Should match the formatted display
            expect(ariaValueText).toBe(formatOffsetDisplay(offset))

            // Should contain 'ms' suffix
            expect(ariaValueText).toContain('ms')

            unmount()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should have accessible buttons with aria-labels for any offset', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: OFFSET_MIN, max: OFFSET_MAX }),
          fc.integer({ min: 10, max: 200 }),
          (offset, step) => {
            const onChange = jest.fn()
            const { unmount } = render(
              <OffsetControl offset={offset} onChange={onChange} step={step} />
            )

            const decrementBtn = screen.getByTestId('offset-decrement')
            const incrementBtn = screen.getByTestId('offset-increment')
            const resetBtn = screen.getByTestId('offset-reset')

            // All buttons should have aria-labels
            expect(decrementBtn).toHaveAttribute('aria-label')
            expect(incrementBtn).toHaveAttribute('aria-label')
            expect(resetBtn).toHaveAttribute('aria-label')

            // Decrement and increment labels should mention the step
            expect(decrementBtn.getAttribute('aria-label')).toContain(String(step))
            expect(incrementBtn.getAttribute('aria-label')).toContain(String(step))

            unmount()
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should have a live region for screen reader announcements', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: OFFSET_MIN, max: OFFSET_MAX }),
          (offset) => {
            const onChange = jest.fn()
            const { unmount } = render(
              <OffsetControl offset={offset} onChange={onChange} />
            )

            const liveRegion = screen.getByRole('status')

            // Live region should have proper attributes
            expect(liveRegion).toHaveAttribute('aria-live', 'polite')
            expect(liveRegion).toHaveAttribute('aria-atomic', 'true')

            unmount()
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should respect custom min/max in ARIA attributes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -5000, max: -1000 }),
          fc.integer({ min: 1000, max: 5000 }),
          (customMin, customMax) => {
            // Ensure offset is within custom range
            const offset = Math.floor((customMin + customMax) / 2)
            const onChange = jest.fn()
            const { unmount } = render(
              <OffsetControl
                offset={offset}
                onChange={onChange}
                min={customMin}
                max={customMax}
              />
            )

            const slider = screen.getByTestId('offset-slider')

            expect(slider).toHaveAttribute('aria-valuemin', String(customMin))
            expect(slider).toHaveAttribute('aria-valuemax', String(customMax))

            unmount()
          }
        ),
        { numRuns: 30 }
      )
    })
  })
})
