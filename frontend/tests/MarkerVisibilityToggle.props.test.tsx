/**
 * Property-based tests for MarkerVisibilityToggle component
 * Using fast-check for property-based testing
 * 
 * **Feature: song-playback-improvements, Property 20: Section marker visibility toggle**
 * **Validates: Requirements 14.2, 14.3**
 */
import * as fc from 'fast-check'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MarkerVisibilityToggle } from '@/components/MarkerVisibilityToggle'

describe('MarkerVisibilityToggle Property Tests', () => {
  afterEach(() => {
    // Clean up DOM and localStorage after each test
    cleanup()
    localStorage.clear()
  })

  /**
   * **Feature: song-playback-improvements, Property 20: Section marker visibility toggle**
   * **Validates: Requirements 14.2, 14.3**
   * 
   * For any toggle of marker visibility, the display should immediately update to show or hide
   * all section markers while preserving the highlighting of actual lyrics.
   */
  describe('Property 20: Section marker visibility toggle', () => {
    it('should toggle visibility state when clicked', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (initialState) => {
            const user = userEvent.setup()
            const onChange = jest.fn()

            render(
              <MarkerVisibilityToggle
                showMarkers={initialState}
                onChange={onChange}
              />
            )

            const toggle = screen.getByRole('switch')
            expect(toggle).toHaveAttribute('aria-checked', String(initialState))

            // Click the toggle
            await user.click(toggle)

            // onChange should be called with opposite value
            expect(onChange).toHaveBeenCalledTimes(1)
            expect(onChange).toHaveBeenCalledWith(!initialState)
            
            // Cleanup after each iteration
            cleanup()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reflect current state in aria-checked attribute', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (showMarkers) => {
            const onChange = jest.fn()

            render(
              <MarkerVisibilityToggle
                showMarkers={showMarkers}
                onChange={onChange}
              />
            )

            const toggle = screen.getByRole('switch')
            expect(toggle).toHaveAttribute('aria-checked', String(showMarkers))
            
            // Cleanup after each iteration
            cleanup()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should apply correct styling based on state', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (showMarkers) => {
            const onChange = jest.fn()

            render(
              <MarkerVisibilityToggle
                showMarkers={showMarkers}
                onChange={onChange}
              />
            )

            const toggle = screen.getByRole('switch')
            
            if (showMarkers) {
              expect(toggle).toHaveClass('bg-primary')
            } else {
              expect(toggle).toHaveClass('bg-muted')
            }
            
            // Cleanup after each iteration
            cleanup()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should be disabled when disabled prop is true', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (showMarkers) => {
            const onChange = jest.fn()

            render(
              <MarkerVisibilityToggle
                showMarkers={showMarkers}
                onChange={onChange}
                disabled={true}
              />
            )

            const toggle = screen.getByRole('switch')
            expect(toggle).toBeDisabled()
            
            // Cleanup after each iteration
            cleanup()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should not call onChange when disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (showMarkers) => {
            const user = userEvent.setup()
            const onChange = jest.fn()

            render(
              <MarkerVisibilityToggle
                showMarkers={showMarkers}
                onChange={onChange}
                disabled={true}
              />
            )

            const toggle = screen.getByRole('switch')
            await user.click(toggle)

            // onChange should not be called when disabled
            expect(onChange).not.toHaveBeenCalled()
            
            // Cleanup after each iteration
            cleanup()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should have proper accessibility attributes', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (showMarkers) => {
            const onChange = jest.fn()

            render(
              <MarkerVisibilityToggle
                showMarkers={showMarkers}
                onChange={onChange}
              />
            )

            const toggle = screen.getByRole('switch')
            expect(toggle).toHaveAttribute('aria-label', 'Toggle section marker visibility')
            expect(toggle).toHaveAttribute('aria-checked')
            expect(toggle).toHaveAttribute('type', 'button')
            
            // Cleanup after each iteration
            cleanup()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should toggle between true and false states correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (initialState) => {
            const user = userEvent.setup()
            let currentState = initialState
            const onChange = jest.fn((newState: boolean) => {
              currentState = newState
            })

            const { rerender } = render(
              <MarkerVisibilityToggle
                showMarkers={currentState}
                onChange={onChange}
              />
            )

            // Click multiple times
            for (let i = 0; i < 3; i++) {
              const toggle = screen.getByRole('switch')
              await user.click(toggle)
              
              // Rerender with new state
              rerender(
                <MarkerVisibilityToggle
                  showMarkers={currentState}
                  onChange={onChange}
                />
              )
            }

            // After 3 clicks, state should be opposite of initial if odd number
            expect(currentState).toBe(!initialState)
            
            // Cleanup after each iteration
            cleanup()
          }
        ),
        { numRuns: 10, timeout: 10000 }
      )
    }, 15000)
  })
})
