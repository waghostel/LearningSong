/**
 * Property-based tests for VTT download button ARIA labeling
 * 
 * **Feature: vtt-download-enhancement, Property 12: ARIA labeling completeness**
 * **Validates: Requirements 4.2**
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

describe('VttDownloadButton ARIA Labeling Property Tests', () => {
  const defaultProps = {
    songStyle: 'Pop',
    createdAt: new Date('2024-12-15'),
    offset: 0,
    disabled: false,
  }

  /**
   * **Feature: vtt-download-enhancement, Property 12: ARIA labeling completeness**
   * **Validates: Requirements 4.2**
   * 
   * For any VTT download button instance, the button element should have appropriate 
   * ARIA attributes including aria-label or accessible text content.
   */
  describe('Property 12: ARIA labeling completeness', () => {
    it('should have aria-label attribute', () => {
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

            const button = screen.getByRole('button', { name: /download.*vtt/i })
            
            // Button should have an aria-label attribute
            const ariaLabel = button.getAttribute('aria-label')
            expect(ariaLabel).toBeTruthy()
            expect(typeof ariaLabel).toBe('string')
            expect(ariaLabel!.length).toBeGreaterThan(0)
            
            // Cleanup
            container.remove()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have descriptive aria-label content', () => {
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

            const button = screen.getByRole('button', { name: /download.*vtt/i })
            
            // Button should have descriptive aria-label
            const ariaLabel = button.getAttribute('aria-label')
            expect(ariaLabel).toBeTruthy()
            
            // Should contain key terms that describe the function
            const labelLower = ariaLabel!.toLowerCase()
            expect(labelLower).toMatch(/download|vtt|subtitle|lyrics/)
            
            // Cleanup
            container.remove()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have title attribute for additional context', () => {
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

            const button = screen.getByRole('button', { name: /download.*vtt/i })
            
            // Button should have a title attribute for tooltip
            const title = button.getAttribute('title')
            expect(title).toBeTruthy()
            expect(typeof title).toBe('string')
            expect(title!.length).toBeGreaterThan(0)
            
            // Title should be descriptive
            const titleLower = title!.toLowerCase()
            expect(titleLower).toMatch(/vtt|subtitle|download|timestamp/)
            
            // Cleanup
            container.remove()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have proper accessible name via aria-label or text content', () => {
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

            // Should be findable by accessible name
            const button = screen.getByRole('button', { name: /download.*vtt/i })
            expect(button).toBeInTheDocument()
            
            // Should have either aria-label or meaningful text content
            const ariaLabel = button.getAttribute('aria-label')
            const textContent = button.textContent
            
            // At least one should provide meaningful description
            const hasAriaLabel = ariaLabel && ariaLabel.length > 0
            const hasTextContent = textContent && textContent.length > 0
            
            expect(hasAriaLabel || hasTextContent).toBe(true)
            
            // If both exist, they should be related to VTT/download functionality
            if (hasAriaLabel) {
              expect(ariaLabel!.toLowerCase()).toMatch(/download|vtt/)
            }
            if (hasTextContent) {
              expect(textContent!.toLowerCase()).toMatch(/download|vtt/)
            }
            
            // Cleanup
            container.remove()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have aria-hidden="true" on decorative icon', () => {
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

            const button = screen.getByRole('button', { name: /download.*vtt/i })
            
            // Look for icon elements (svg or elements with icon classes)
            const icons = button.querySelectorAll('svg, [class*="icon"], [class*="lucide"]')
            
            // If icons exist, they should have aria-hidden="true"
            icons.forEach(icon => {
              const ariaHidden = icon.getAttribute('aria-hidden')
              expect(ariaHidden).toBe('true')
            })
            
            // Cleanup
            container.remove()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain ARIA attributes when disabled', () => {
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

            const button = screen.getByRole('button', { name: /download.*vtt/i })
            
            // Should still have proper ARIA attributes when disabled
            const ariaLabel = button.getAttribute('aria-label')
            expect(ariaLabel).toBeTruthy()
            expect(ariaLabel!.length).toBeGreaterThan(0)
            
            const title = button.getAttribute('title')
            expect(title).toBeTruthy()
            expect(title!.length).toBeGreaterThan(0)
            
            // Should still be findable by accessible name
            expect(button).toBeInTheDocument()
            
            // Cleanup
            container.remove()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should have consistent ARIA labeling across different props', () => {
      fc.assert(
        fc.property(
          nonEmptyLineCuesArbitrary,
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.date(),
          fc.integer({ min: -1000, max: 1000 }),
          (lineCues, songStyle, createdAt, offset) => {
            const { container } = render(
              <VttDownloadButton
                lineCues={lineCues}
                songStyle={songStyle}
                createdAt={createdAt}
                offset={offset}
              />
            )

            const button = screen.getByRole('button', { name: /download.*vtt/i })
            
            // Should always have consistent ARIA attributes regardless of other props
            const ariaLabel = button.getAttribute('aria-label')
            expect(ariaLabel).toBeTruthy()
            expect(ariaLabel!.toLowerCase()).toMatch(/download.*vtt|vtt.*download/)
            
            const title = button.getAttribute('title')
            expect(title).toBeTruthy()
            expect(title!.toLowerCase()).toMatch(/vtt|subtitle/)
            
            // Cleanup
            container.remove()
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})