/**
 * Property-based tests for VttDownloadButton component
 * Using fast-check for property-based testing
 * 
 * **Feature: vtt-download-enhancement, Property 4: VTT button visibility based on data availability**
 * **Validates: Requirements 2.1, 6.1**
 */
import * as fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { VttDownloadButton } from '@/components/VttDownloadButton'
import type { LineCue } from '@/lib/vtt-generator'

// Generator for valid LineCue objects
const lineCueArbitrary = fc.record({
  lineIndex: fc.nat({ max: 1000 }),
  text: fc.string({ minLength: 1, maxLength: 200 }),
  startTime: fc.float({ min: 0, max: 3600, noNaN: true }),
  endTime: fc.float({ min: 0, max: 3600, noNaN: true }),
  isMarker: fc.boolean(),
}).map(cue => ({
  ...cue,
  // Ensure endTime >= startTime
  endTime: Math.max(cue.startTime, cue.endTime),
})) as fc.Arbitrary<LineCue>

// Generator for non-empty array of LineCues
const nonEmptyLineCuesArbitrary = fc.array(lineCueArbitrary, { minLength: 1, maxLength: 50 })

// Generator for empty array
const emptyLineCuesArbitrary = fc.constant([] as LineCue[])

describe('VttDownloadButton Property Tests', () => {
  const defaultProps = {
    songStyle: 'Pop',
    createdAt: new Date('2024-12-15'),
    offset: 0,
    disabled: false,
  }

  /**
   * **Feature: vtt-download-enhancement, Property 4: VTT button visibility based on data availability**
   * **Validates: Requirements 2.1, 6.1**
   * 
   * For any set of line cues, the VTT download button should be visible 
   * if and only if the line cues array is non-empty.
   */
  describe('Property 4: VTT button visibility based on data availability', () => {
    it('should render button when lineCues array is non-empty', () => {
      fc.assert(
        fc.property(
          nonEmptyLineCuesArbitrary,
          (lineCues) => {
            const { container } = render(
              <VttDownloadButton
                lineCues={lineCues}
                {...defaultProps}
              />
            )

            // Button should be visible when lineCues is non-empty
            const button = screen.queryByRole('button', { name: /download.*vtt/i })
            expect(button).toBeInTheDocument()
            
            // Cleanup
            container.remove()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not render button when lineCues array is empty', () => {
      fc.assert(
        fc.property(
          emptyLineCuesArbitrary,
          (lineCues) => {
            const { container } = render(
              <VttDownloadButton
                lineCues={lineCues}
                {...defaultProps}
              />
            )

            // Button should NOT be visible when lineCues is empty
            const button = screen.queryByRole('button', { name: /download.*vtt/i })
            expect(button).not.toBeInTheDocument()
            
            // Cleanup
            container.remove()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain visibility invariant: visible iff lineCues.length > 0', () => {
      fc.assert(
        fc.property(
          fc.oneof(nonEmptyLineCuesArbitrary, emptyLineCuesArbitrary),
          (lineCues) => {
            const { container } = render(
              <VttDownloadButton
                lineCues={lineCues}
                {...defaultProps}
              />
            )

            const button = screen.queryByRole('button', { name: /download.*vtt/i })
            const isVisible = button !== null
            const hasLineCues = lineCues.length > 0

            // Visibility should match whether we have line cues
            expect(isVisible).toBe(hasLineCues)
            
            // Cleanup
            container.remove()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should remain visible regardless of disabled state when lineCues exist', () => {
      fc.assert(
        fc.property(
          nonEmptyLineCuesArbitrary,
          fc.boolean(),
          (lineCues, disabled) => {
            const { container } = render(
              <VttDownloadButton
                lineCues={lineCues}
                {...defaultProps}
                disabled={disabled}
              />
            )

            // Button should be visible regardless of disabled state
            const button = screen.queryByRole('button', { name: /download.*vtt/i })
            expect(button).toBeInTheDocument()
            
            // Cleanup
            container.remove()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should remain hidden regardless of other props when lineCues is empty', () => {
      fc.assert(
        fc.property(
          emptyLineCuesArbitrary,
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.date(),
          fc.integer({ min: -10000, max: 10000 }),
          fc.boolean(),
          (lineCues, style, date, offset, disabled) => {
            const { container } = render(
              <VttDownloadButton
                lineCues={lineCues}
                songStyle={style}
                createdAt={date}
                offset={offset}
                disabled={disabled}
              />
            )

            // Button should NOT be visible regardless of other props
            const button = screen.queryByRole('button', { name: /download.*vtt/i })
            expect(button).not.toBeInTheDocument()
            
            // Cleanup
            container.remove()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('VTT button disabled state', () => {
    it('should be disabled when disabled prop is true and lineCues exist', () => {
      fc.assert(
        fc.property(
          nonEmptyLineCuesArbitrary,
          (lineCues) => {
            const { container } = render(
              <VttDownloadButton
                lineCues={lineCues}
                {...defaultProps}
                disabled={true}
              />
            )

            const button = screen.queryByRole('button', { name: /download.*vtt/i })
            expect(button).toBeDisabled()
            
            // Cleanup
            container.remove()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should be enabled when disabled prop is false and lineCues exist', () => {
      fc.assert(
        fc.property(
          nonEmptyLineCuesArbitrary,
          (lineCues) => {
            const { container } = render(
              <VttDownloadButton
                lineCues={lineCues}
                {...defaultProps}
                disabled={false}
              />
            )

            const button = screen.queryByRole('button', { name: /download.*vtt/i })
            expect(button).not.toBeDisabled()
            
            // Cleanup
            container.remove()
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
