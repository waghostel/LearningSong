/**
 * Property-based tests for SongSwitcher component
 * Using fast-check for property-based testing
 */
import * as fc from 'fast-check'
import { render, cleanup } from '@testing-library/react'
import { SongSwitcher } from '@/components/SongSwitcher'
import type { SongVariation } from '@/api/songs'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Arbitrary generator for SongVariation
const songVariationArbitrary = (index: number = 0): fc.Arbitrary<SongVariation> =>
  fc.record({
    audio_url: fc.webUrl(),
    audio_id: fc.uuid(),
    variation_index: fc.constant(index),
  })

describe('SongSwitcher Property Tests', () => {
  /**
   * **Feature: dual-song-selection, Property 5: Switcher visibility with multiple variations**
   * **Validates: Requirements 2.1**
   *
   * For any song with exactly 2 variations, the song switcher component
   * should be rendered and visible in the UI.
   */
  describe('Property 5: Switcher visibility with multiple variations', () => {
    it('should render switcher when variations.length === 2', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          (variation1, variation2) => {
            const variations = [variation1, variation2]
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={0}
                onSwitch={() => {}}
              />
            )

            // Switcher should be present in the DOM
            const switcher = container.querySelector('[data-testid="song-switcher"]')
            expect(switcher).toBeInTheDocument()
            expect(switcher).toBeVisible()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should display both version buttons when 2 variations exist', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          (variation1, variation2) => {
            const variations = [variation1, variation2]
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={0}
                onSwitch={() => {}}
              />
            )

            // Both version buttons should be present
            const buttons = container.querySelectorAll('button[aria-label*="Version"]')
            expect(buttons).toHaveLength(2)
            expect(buttons[0].textContent).toContain('Version 1')
            expect(buttons[1].textContent).toContain('Version 2')
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: dual-song-selection, Property 6: Switcher hidden with single variation**
   * **Validates: Requirements 2.2**
   *
   * For any song with exactly 1 variation, the song switcher component
   * should not be rendered in the UI.
   */
  describe('Property 6: Switcher hidden with single variation', () => {
    it('should NOT render switcher when variations.length === 1', () => {
      fc.assert(
        fc.property(songVariationArbitrary(0), (variation) => {
          const variations = [variation]
          const { container } = render(
            <SongSwitcher
              variations={variations}
              activeIndex={0}
              onSwitch={() => {}}
            />
          )

          // Switcher should NOT be present in the DOM
          const switcher = container.querySelector('[data-testid="song-switcher"]')
          expect(switcher).not.toBeInTheDocument()
        }),
        { numRuns: 100 }
      )
    })

    it('should NOT render switcher when variations array is empty', () => {
      const { container } = render(
        <SongSwitcher variations={[]} activeIndex={0} onSwitch={() => {}} />
      )

      // Switcher should NOT be present in the DOM
      const switcher = container.querySelector('[data-testid="song-switcher"]')
      expect(switcher).not.toBeInTheDocument()
    })
  })

  /**
   * **Feature: dual-song-selection, Property 23: Keyboard navigation support**
   * **Validates: Requirements 9.2**
   *
   * For any song switcher component, users should be able to navigate between variations
   * using keyboard controls (Tab, Arrow keys) and activate selections using Enter or Space keys.
   */
  describe('Property 23: Keyboard navigation support', () => {
    it('should support arrow key navigation between variations', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }), // initial activeIndex
          (variation1, variation2, initialIndex) => {
            const variations = [variation1, variation2]
            const mockOnSwitch = jest.fn()
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={initialIndex}
                onSwitch={mockOnSwitch}
              />
            )

            const switcher = container.querySelector('[data-testid="song-switcher"]')
            expect(switcher).toBeInTheDocument()

            // Test ArrowRight - should move to next variation (or wrap to 0)
            const expectedNextIndex = initialIndex < variations.length - 1 ? initialIndex + 1 : 0
            const arrowRightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
            switcher?.dispatchEvent(arrowRightEvent)
            
            if (expectedNextIndex !== initialIndex) {
              expect(mockOnSwitch).toHaveBeenCalledWith(expectedNextIndex)
            }

            cleanup()
            mockOnSwitch.mockClear()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should support ArrowLeft to navigate to previous variation', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }), // initial activeIndex
          (variation1, variation2, initialIndex) => {
            const variations = [variation1, variation2]
            const mockOnSwitch = jest.fn()
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={initialIndex}
                onSwitch={mockOnSwitch}
              />
            )

            const switcher = container.querySelector('[data-testid="song-switcher"]')
            expect(switcher).toBeInTheDocument()

            // Test ArrowLeft - should move to previous variation (or wrap to last)
            const expectedPrevIndex = initialIndex > 0 ? initialIndex - 1 : variations.length - 1
            const arrowLeftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
            switcher?.dispatchEvent(arrowLeftEvent)
            
            if (expectedPrevIndex !== initialIndex) {
              expect(mockOnSwitch).toHaveBeenCalledWith(expectedPrevIndex)
            }

            cleanup()
            mockOnSwitch.mockClear()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should support Home key to jump to first variation', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.constant(1), // Start at index 1
          (variation1, variation2, initialIndex) => {
            const variations = [variation1, variation2]
            const mockOnSwitch = jest.fn()
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={initialIndex}
                onSwitch={mockOnSwitch}
              />
            )

            const switcher = container.querySelector('[data-testid="song-switcher"]')
            expect(switcher).toBeInTheDocument()

            // Test Home key - should jump to first variation (index 0)
            const homeEvent = new KeyboardEvent('keydown', { key: 'Home', bubbles: true })
            switcher?.dispatchEvent(homeEvent)
            
            expect(mockOnSwitch).toHaveBeenCalledWith(0)

            cleanup()
            mockOnSwitch.mockClear()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should support End key to jump to last variation', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.constant(0), // Start at index 0
          (variation1, variation2, initialIndex) => {
            const variations = [variation1, variation2]
            const mockOnSwitch = jest.fn()
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={initialIndex}
                onSwitch={mockOnSwitch}
              />
            )

            const switcher = container.querySelector('[data-testid="song-switcher"]')
            expect(switcher).toBeInTheDocument()

            // Test End key - should jump to last variation (index 1)
            const endEvent = new KeyboardEvent('keydown', { key: 'End', bubbles: true })
            switcher?.dispatchEvent(endEvent)
            
            expect(mockOnSwitch).toHaveBeenCalledWith(variations.length - 1)

            cleanup()
            mockOnSwitch.mockClear()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not trigger navigation when disabled', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }),
          (variation1, variation2, initialIndex) => {
            const variations = [variation1, variation2]
            const mockOnSwitch = jest.fn()
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={initialIndex}
                onSwitch={mockOnSwitch}
                disabled={true}
              />
            )

            const switcher = container.querySelector('[data-testid="song-switcher"]')
            expect(switcher).toBeInTheDocument()

            // Try arrow key navigation while disabled
            const arrowRightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
            switcher?.dispatchEvent(arrowRightEvent)
            
            // Should NOT call onSwitch when disabled
            expect(mockOnSwitch).not.toHaveBeenCalled()

            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not trigger navigation when loading', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }),
          (variation1, variation2, initialIndex) => {
            const variations = [variation1, variation2]
            const mockOnSwitch = jest.fn()
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={initialIndex}
                onSwitch={mockOnSwitch}
                isLoading={true}
              />
            )

            const switcher = container.querySelector('[data-testid="song-switcher"]')
            expect(switcher).toBeInTheDocument()

            // Try arrow key navigation while loading
            const arrowRightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
            switcher?.dispatchEvent(arrowRightEvent)
            
            // Should NOT call onSwitch when loading
            expect(mockOnSwitch).not.toHaveBeenCalled()

            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: dual-song-selection, Property 24: Focus indication**
   * **Validates: Requirements 9.3**
   *
   * For any focused element within the song switcher, the element should have
   * visible focus indicators (outline, border, or background change).
   */
  describe('Property 24: Focus indication', () => {
    it('should have focus-visible classes on all variation buttons', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }),
          (variation1, variation2, activeIndex) => {
            const variations = [variation1, variation2]
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={activeIndex}
                onSwitch={() => {}}
              />
            )

            // Get all variation buttons
            const buttons = container.querySelectorAll('button[aria-label*="Version"]')
            expect(buttons).toHaveLength(2)

            // Each button should have focus indicator classes
            buttons.forEach((button) => {
              const classList = Array.from(button.classList)
              
              // Check for focus-visible ring classes
              const hasFocusVisibleRing = classList.some(
                (cls) => cls.includes('focus-visible:ring') || cls.includes('focus:ring')
              )
              expect(hasFocusVisibleRing).toBe(true)
            })

            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have focus-visible:outline-none to use custom focus styles', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }),
          (variation1, variation2, activeIndex) => {
            const variations = [variation1, variation2]
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={activeIndex}
                onSwitch={() => {}}
              />
            )

            // Get all variation buttons
            const buttons = container.querySelectorAll('button[aria-label*="Version"]')
            expect(buttons).toHaveLength(2)

            // Each button should have focus-visible:outline-none for custom focus styles
            buttons.forEach((button) => {
              const classList = Array.from(button.classList)
              const hasFocusOutlineNone = classList.some(
                (cls) => cls.includes('focus-visible:outline-none') || cls.includes('focus:outline-none')
              )
              expect(hasFocusOutlineNone).toBe(true)
            })

            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have ring-offset for better focus visibility', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }),
          (variation1, variation2, activeIndex) => {
            const variations = [variation1, variation2]
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={activeIndex}
                onSwitch={() => {}}
              />
            )

            // Get all variation buttons
            const buttons = container.querySelectorAll('button[aria-label*="Version"]')
            expect(buttons).toHaveLength(2)

            // Each button should have ring-offset classes for better visibility
            buttons.forEach((button) => {
              const classList = Array.from(button.classList)
              const hasRingOffset = classList.some(
                (cls) => cls.includes('ring-offset')
              )
              expect(hasRingOffset).toBe(true)
            })

            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have z-index on focus for proper layering', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }),
          (variation1, variation2, activeIndex) => {
            const variations = [variation1, variation2]
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={activeIndex}
                onSwitch={() => {}}
              />
            )

            // Get all variation buttons
            const buttons = container.querySelectorAll('button[aria-label*="Version"]')
            expect(buttons).toHaveLength(2)

            // Each button should have z-index on focus for proper layering
            buttons.forEach((button) => {
              const classList = Array.from(button.classList)
              const hasZIndex = classList.some(
                (cls) => cls.includes('focus-visible:z-')
              )
              expect(hasZIndex).toBe(true)
            })

            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: dual-song-selection, Property 25: Screen reader accessibility**
   * **Validates: Requirements 9.4**
   *
   * For any song switcher component, all interactive elements should have
   * appropriate ARIA labels announcing the current version and available options.
   */
  describe('Property 25: Screen reader accessibility', () => {
    it('should have role="group" with aria-label on container', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }),
          (variation1, variation2, activeIndex) => {
            const variations = [variation1, variation2]
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={activeIndex}
                onSwitch={() => {}}
              />
            )

            const switcher = container.querySelector('[data-testid="song-switcher"]')
            expect(switcher).toHaveAttribute('role', 'group')
            expect(switcher).toHaveAttribute('aria-label', 'Song version switcher')

            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have descriptive aria-label on each variation button', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }),
          (variation1, variation2, activeIndex) => {
            const variations = [variation1, variation2]
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={activeIndex}
                onSwitch={() => {}}
              />
            )

            // Get all variation buttons
            const buttons = container.querySelectorAll('button[aria-label*="Version"]')
            expect(buttons).toHaveLength(2)

            // Each button should have a descriptive aria-label
            buttons.forEach((button, index) => {
              const ariaLabel = button.getAttribute('aria-label')
              expect(ariaLabel).toContain(`Version ${index + 1}`)
              
              // Active button should indicate it's currently playing
              if (index === activeIndex) {
                expect(ariaLabel).toContain('currently playing')
              }
            })

            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have aria-checked attribute on variation buttons', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }),
          (variation1, variation2, activeIndex) => {
            const variations = [variation1, variation2]
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={activeIndex}
                onSwitch={() => {}}
              />
            )

            // Get all variation buttons
            const buttons = container.querySelectorAll('button[aria-label*="Version"]')
            expect(buttons).toHaveLength(2)

            // Each button should have aria-checked attribute (Radix UI uses radio role)
            buttons.forEach((button, index) => {
              const ariaChecked = button.getAttribute('aria-checked')
              expect(ariaChecked).toBe(index === activeIndex ? 'true' : 'false')
            })

            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have aria-current on active variation button', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }),
          (variation1, variation2, activeIndex) => {
            const variations = [variation1, variation2]
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={activeIndex}
                onSwitch={() => {}}
              />
            )

            // Get all variation buttons
            const buttons = container.querySelectorAll('button[aria-label*="Version"]')
            expect(buttons).toHaveLength(2)

            // Active button should have aria-current
            buttons.forEach((button, index) => {
              if (index === activeIndex) {
                expect(button).toHaveAttribute('aria-current', 'true')
              } else {
                expect(button).not.toHaveAttribute('aria-current')
              }
            })

            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have aria-live region for status updates', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }),
          (variation1, variation2, activeIndex) => {
            const variations = [variation1, variation2]
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={activeIndex}
                onSwitch={() => {}}
              />
            )

            // Should have aria-live region for status
            const statusRegion = container.querySelector('[aria-live="polite"]')
            expect(statusRegion).toBeInTheDocument()
            expect(statusRegion).toHaveAttribute('role', 'status')
            expect(statusRegion?.textContent).toContain(`Version ${activeIndex + 1}`)

            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have aria-labelledby connecting label to toggle group', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }),
          (variation1, variation2, activeIndex) => {
            const variations = [variation1, variation2]
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={activeIndex}
                onSwitch={() => {}}
              />
            )

            // Label should have an id
            const label = container.querySelector('#song-switcher-label')
            expect(label).toBeInTheDocument()
            expect(label?.textContent).toBe('Song Version')

            // Toggle group should reference the label
            const toggleGroup = container.querySelector('[aria-labelledby="song-switcher-label"]')
            expect(toggleGroup).toBeInTheDocument()

            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have aria-describedby for additional context', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }),
          (variation1, variation2, activeIndex) => {
            const variations = [variation1, variation2]
            
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={activeIndex}
                onSwitch={() => {}}
              />
            )

            // Description should have an id
            const description = container.querySelector('#song-switcher-description')
            expect(description).toBeInTheDocument()

            // Toggle group should reference the description
            const toggleGroup = container.querySelector('[aria-describedby="song-switcher-description"]')
            expect(toggleGroup).toBeInTheDocument()

            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: dual-song-selection, Property 7: Active variation indication**
   * **Validates: Requirements 2.4**
   *
   * For any displayed song switcher, the variation matching the current activeIndex
   * should have distinct visual styling or attributes indicating it is active.
   */
  describe('Property 7: Active variation indication', () => {
    it('should mark the active variation with aria-checked="true"', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }), // activeIndex
          (variation1, variation2, activeIndex) => {
            const variations = [variation1, variation2]
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={activeIndex}
                onSwitch={() => {}}
              />
            )

            // Get both buttons using container queries
            const buttons = container.querySelectorAll('button[aria-label*="Version"]')
            expect(buttons).toHaveLength(2)
            
            const version1Button = buttons[0]
            const version2Button = buttons[1]

            // The active button should have aria-checked="true" (Radix UI uses radio role)
            if (activeIndex === 0) {
              expect(version1Button).toHaveAttribute('aria-checked', 'true')
              expect(version2Button).toHaveAttribute('aria-checked', 'false')
            } else {
              expect(version1Button).toHaveAttribute('aria-checked', 'false')
              expect(version2Button).toHaveAttribute('aria-checked', 'true')
            }
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include "currently playing" in aria-label for active variation', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }), // activeIndex
          (variation1, variation2, activeIndex) => {
            const variations = [variation1, variation2]
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={activeIndex}
                onSwitch={() => {}}
              />
            )

            // The active button should have "currently playing" in its aria-label
            const activeButton = container.querySelector(
              `[aria-label*="Version ${activeIndex + 1}"][aria-label*="currently playing"]`
            )
            expect(activeButton).toBeInTheDocument()
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should apply data-state="on" to active variation button', () => {
      fc.assert(
        fc.property(
          songVariationArbitrary(0),
          songVariationArbitrary(1),
          fc.integer({ min: 0, max: 1 }), // activeIndex
          (variation1, variation2, activeIndex) => {
            const variations = [variation1, variation2]
            const { container } = render(
              <SongSwitcher
                variations={variations}
                activeIndex={activeIndex}
                onSwitch={() => {}}
              />
            )

            // Get both buttons using container queries
            const buttons = container.querySelectorAll('button[aria-label*="Version"]')
            expect(buttons).toHaveLength(2)
            
            const version1Button = buttons[0]
            const version2Button = buttons[1]

            // The active button should have data-state="on"
            if (activeIndex === 0) {
              expect(version1Button).toHaveAttribute('data-state', 'on')
              expect(version2Button).toHaveAttribute('data-state', 'off')
            } else {
              expect(version1Button).toHaveAttribute('data-state', 'off')
              expect(version2Button).toHaveAttribute('data-state', 'on')
            }
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
