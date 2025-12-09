/**
 * Property-based tests for RegenerateButton component
 * Property 2: UI disabled during regeneration
 * Validates: Requirements 1.2
 */

import { render, screen } from '@testing-library/react'
import * as fc from 'fast-check'
import { RegenerateButton } from '@/components/RegenerateButton'

describe('RegenerateButton Property Tests', () => {
  describe('Property 2: UI disabled during regeneration (Requirements 1.2)', () => {
    it('button is always disabled when isRegenerating is true regardless of other props', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary values for other props
          fc.boolean(), // hasUnsavedEdits
          fc.boolean(), // isRateLimited
          fc.boolean(), // isOffline
          (hasUnsavedEdits, isRateLimited, isOffline) => {
            const mockOnRegenerate = jest.fn()

            const { unmount } = render(
              <RegenerateButton
                onRegenerate={mockOnRegenerate}
                isRegenerating={true} // Always true for this property
                hasUnsavedEdits={hasUnsavedEdits}
                isRateLimited={isRateLimited}
                isOffline={isOffline}
              />
            )

            const button = screen.getByRole('button')
            
            // Property: button must be disabled when regenerating
            expect(button).toBeDisabled()
            
            // Property: loading text must be shown
            expect(screen.getByText('Regenerating...')).toBeInTheDocument()
            
            // Property: aria-busy must be true
            expect(button).toHaveAttribute('aria-busy', 'true')
            
            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('button is enabled when not regenerating and no other disabling conditions', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // hasUnsavedEdits - should not affect disabled state
          (hasUnsavedEdits) => {
            const mockOnRegenerate = jest.fn()

            const { unmount } = render(
              <RegenerateButton
                onRegenerate={mockOnRegenerate}
                isRegenerating={false}
                hasUnsavedEdits={hasUnsavedEdits}
                isRateLimited={false}
                isOffline={false}
              />
            )

            const button = screen.getByRole('button')
            
            // Property: button must be enabled when not regenerating/rate limited/offline
            expect(button).not.toBeDisabled()
            
            // Property: normal text must be shown
            expect(screen.getByText('Regenerate Lyrics')).toBeInTheDocument()
            
            // Property: aria-busy must not be true
            expect(button).not.toHaveAttribute('aria-busy', 'true')
            
            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('button is disabled when any disabling condition is true', () => {
      // Generate at least one true disabling condition
      const atLeastOneTrue = fc.tuple(
        fc.boolean(),
        fc.boolean(),
        fc.boolean()
      ).filter(([a, b, c]) => a || b || c)

      fc.assert(
        fc.property(
          atLeastOneTrue,
          fc.boolean(), // hasUnsavedEdits
          ([isRegenerating, isRateLimited, isOffline], hasUnsavedEdits) => {
            const mockOnRegenerate = jest.fn()

            const { unmount } = render(
              <RegenerateButton
                onRegenerate={mockOnRegenerate}
                isRegenerating={isRegenerating}
                hasUnsavedEdits={hasUnsavedEdits}
                isRateLimited={isRateLimited}
                isOffline={isOffline}
              />
            )

            const button = screen.getByRole('button')
            
            // Property: button must be disabled when any disabling condition is true
            expect(button).toBeDisabled()
            
            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('loading indicator is only shown when isRegenerating is true', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // isRegenerating
          fc.boolean(), // hasUnsavedEdits
          fc.boolean(), // isRateLimited
          fc.boolean(), // isOffline
          (isRegenerating, hasUnsavedEdits, isRateLimited, isOffline) => {
            const mockOnRegenerate = jest.fn()

            const { unmount } = render(
              <RegenerateButton
                onRegenerate={mockOnRegenerate}
                isRegenerating={isRegenerating}
                hasUnsavedEdits={hasUnsavedEdits}
                isRateLimited={isRateLimited}
                isOffline={isOffline}
              />
            )

            const button = screen.getByRole('button')
            
            if (isRegenerating) {
              // Property: loading text must be shown when regenerating
              expect(screen.getByText('Regenerating...')).toBeInTheDocument()
              expect(button).toHaveAttribute('aria-busy', 'true')
            } else {
              // Property: normal text must be shown when not regenerating
              expect(screen.getByText('Regenerate Lyrics')).toBeInTheDocument()
              expect(button).not.toHaveAttribute('aria-busy', 'true')
            }
            
            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('hasUnsavedEdits should never affect disabled state', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // hasUnsavedEdits
          (hasUnsavedEdits) => {
            const mockOnRegenerate = jest.fn()

            // Test with both true and false hasUnsavedEdits
            const { unmount: unmount1 } = render(
              <RegenerateButton
                onRegenerate={mockOnRegenerate}
                isRegenerating={false}
                hasUnsavedEdits={hasUnsavedEdits}
                isRateLimited={false}
                isOffline={false}
              />
            )

            const button1 = screen.getByRole('button')
            
            // Property: hasUnsavedEdits should not affect enabled/disabled state
            expect(button1).not.toBeDisabled()
            
            unmount1()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 2.1: Disabled reason message consistency', () => {
    it('shows appropriate disabled reason message based on condition priority', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // isRegenerating
          fc.boolean(), // isRateLimited
          fc.boolean(), // isOffline
          (isRegenerating, isRateLimited, isOffline) => {
            const mockOnRegenerate = jest.fn()
            const anyDisabled = isRegenerating || isRateLimited || isOffline

            if (!anyDisabled) return // Skip when all enabled

            const { unmount } = render(
              <RegenerateButton
                onRegenerate={mockOnRegenerate}
                isRegenerating={isRegenerating}
                hasUnsavedEdits={false}
                isRateLimited={isRateLimited}
                isOffline={isOffline}
              />
            )

            const button = screen.getByRole('button')
            expect(button).toBeDisabled()

            // Property: aria-label should indicate disabled state appropriately
            // When regenerating: "Regenerating lyrics, please wait"
            // When rate limited/offline: includes "disabled"
            const ariaLabel = button.getAttribute('aria-label') || ''
            if (isRegenerating) {
              expect(ariaLabel).toContain('please wait')
            } else {
              expect(ariaLabel).toContain('disabled')
            }
            
            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
