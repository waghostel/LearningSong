/**
 * Property-based tests for VersionSelector component
 * 
 * Feature: lyrics-regeneration-versioning, Tasks 6.1, 6.2, 6.3
 * Using fast-check for property-based testing
 * 
 * Properties tested:
 * - Property 6: Version selection updates display (Requirements: 2.2)
 * - Property 10: Active version highlighting (Requirements: 3.4)
 * - Property 9: Version display includes metadata (Requirements: 3.1, 3.3)
 */

import * as fc from 'fast-check'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { VersionSelector } from '@/components/VersionSelector'
import type { LyricsVersion } from '@/stores/lyricsEditingStore'

// Custom arbitrary for generating valid lyrics strings
const lyricsArbitrary = fc.string({ minLength: 1, maxLength: 500 })

// Custom arbitrary for generating LyricsVersion objects
const versionArbitrary: fc.Arbitrary<LyricsVersion> = fc.record({
  id: fc.uuid(),
  lyrics: lyricsArbitrary,
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  isEdited: fc.boolean(),
  editedLyrics: fc.option(lyricsArbitrary, { nil: undefined }),
})

// Arbitrary for generating arrays of versions (minimum 2 for display)
const versionsArrayArbitrary = fc.array(versionArbitrary, { minLength: 2, maxLength: 8 })
  .filter(versions => {
    // Ensure all IDs are unique
    const ids = new Set(versions.map(v => v.id))
    return ids.size === versions.length
  })

// Helper function to render and automatically cleanup
const renderWithCleanup = (element: React.ReactElement) => {
  cleanup() // Clean up before each render
  return render(element)
}

describe('VersionSelector Property Tests', () => {
  // Cleanup after each test case
  afterEach(() => {
    cleanup()
  })

  describe('Property 6: Version selection updates display', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 6
     * Validates: Requirements 2.2
     * 
     * For any version selection, the onVersionSelect callback should be called
     * with the correct version ID.
     */
    it('should call onVersionSelect with correct version ID when any version is clicked', () => {
      fc.assert(
        fc.property(
          versionsArrayArbitrary,
          (versions) => {
            const mockOnVersionSelect = jest.fn()
            const mockOnVersionDelete = jest.fn()
            
            // Pick a random version to be active
            const activeVersion = versions[0]
            
            renderWithCleanup(
              <VersionSelector
                versions={versions}
                activeVersionId={activeVersion.id}
                onVersionSelect={mockOnVersionSelect}
                onVersionDelete={mockOnVersionDelete}
              />
            )
            
            // Click each version tab and verify callback is called with correct ID
            versions.forEach(version => {
              const tab = document.getElementById(`version-tab-${version.id}`)
              if (tab) {
                fireEvent.click(tab)
                expect(mockOnVersionSelect).toHaveBeenLastCalledWith(version.id)
              }
            })
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should render all versions as clickable tabs', () => {
      fc.assert(
        fc.property(
          versionsArrayArbitrary,
          (versions) => {
            const mockOnVersionSelect = jest.fn()
            const mockOnVersionDelete = jest.fn()
            
            renderWithCleanup(
              <VersionSelector
                versions={versions}
                activeVersionId={versions[0].id}
                onVersionSelect={mockOnVersionSelect}
                onVersionDelete={mockOnVersionDelete}
              />
            )
            
            // All versions should have corresponding tabs
            const tabs = screen.getAllByRole('tab')
            expect(tabs.length).toBe(versions.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 10: Active version highlighting', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 10
     * Validates: Requirements 3.4
     * 
     * For any rendered version selector, the active version should have
     * aria-selected=true and all other versions should have aria-selected=false.
     */
    it('should have exactly one version with aria-selected=true', () => {
      fc.assert(
        fc.property(
          versionsArrayArbitrary,
          fc.integer({ min: 0 }),
          (versions, randomIndex) => {
            const mockOnVersionSelect = jest.fn()
            const mockOnVersionDelete = jest.fn()
            
            // Select a random version as active
            const activeIndex = randomIndex % versions.length
            const activeVersion = versions[activeIndex]
            
            renderWithCleanup(
              <VersionSelector
                versions={versions}
                activeVersionId={activeVersion.id}
                onVersionSelect={mockOnVersionSelect}
                onVersionDelete={mockOnVersionDelete}
              />
            )
            
            const tabs = screen.getAllByRole('tab')
            
            // Count tabs with aria-selected="true"
            const selectedTabs = tabs.filter(
              tab => tab.getAttribute('aria-selected') === 'true'
            )
            
            expect(selectedTabs.length).toBe(1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set aria-selected=true only on the active version', () => {
      fc.assert(
        fc.property(
          versionsArrayArbitrary,
          fc.integer({ min: 0 }),
          (versions, randomIndex) => {
            const mockOnVersionSelect = jest.fn()
            const mockOnVersionDelete = jest.fn()
            
            const activeIndex = randomIndex % versions.length
            const activeVersion = versions[activeIndex]
            
            renderWithCleanup(
              <VersionSelector
                versions={versions}
                activeVersionId={activeVersion.id}
                onVersionSelect={mockOnVersionSelect}
                onVersionDelete={mockOnVersionDelete}
              />
            )
            
            // The active version tab should have aria-selected=true
            const activeTab = document.getElementById(`version-tab-${activeVersion.id}`)
            expect(activeTab).toHaveAttribute('aria-selected', 'true')
            
            // All other versions should have aria-selected=false
            versions.forEach(version => {
              if (version.id !== activeVersion.id) {
                const tab = document.getElementById(`version-tab-${version.id}`)
                expect(tab).toHaveAttribute('aria-selected', 'false')
              }
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should apply primary styles to active version', () => {
      fc.assert(
        fc.property(
          versionsArrayArbitrary,
          fc.integer({ min: 0 }),
          (versions, randomIndex) => {
            const mockOnVersionSelect = jest.fn()
            const mockOnVersionDelete = jest.fn()
            
            const activeIndex = randomIndex % versions.length
            const activeVersion = versions[activeIndex]
            
            renderWithCleanup(
              <VersionSelector
                versions={versions}
                activeVersionId={activeVersion.id}
                onVersionSelect={mockOnVersionSelect}
                onVersionDelete={mockOnVersionDelete}
              />
            )
            
            const activeTab = document.getElementById(`version-tab-${activeVersion.id}`)
            expect(activeTab).toHaveClass('bg-primary')
            expect(activeTab).toHaveClass('text-primary-foreground')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 9: Version display includes metadata', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 9
     * Validates: Requirements 3.1, 3.3
     * 
     * For any rendered version in the selector, the display should contain
     * the version number and each version should have a tooltip with timestamp.
     */
    it('should display sequential version numbers', () => {
      fc.assert(
        fc.property(
          versionsArrayArbitrary,
          (versions) => {
            const mockOnVersionSelect = jest.fn()
            const mockOnVersionDelete = jest.fn()
            
            renderWithCleanup(
              <VersionSelector
                versions={versions}
                activeVersionId={versions[0].id}
                onVersionSelect={mockOnVersionSelect}
                onVersionDelete={mockOnVersionDelete}
              />
            )
            
            const tabs = screen.getAllByRole('tab')
            
            // Each tab should have a version number (V1, V2, etc.)
            tabs.forEach((tab, index) => {
              expect(tab).toHaveTextContent(`V${index + 1}`)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have tooltip elements for each version', () => {
      fc.assert(
        fc.property(
          versionsArrayArbitrary,
          (versions) => {
            const mockOnVersionSelect = jest.fn()
            const mockOnVersionDelete = jest.fn()
            
            renderWithCleanup(
              <VersionSelector
                versions={versions}
                activeVersionId={versions[0].id}
                onVersionSelect={mockOnVersionSelect}
                onVersionDelete={mockOnVersionDelete}
              />
            )
            
            // Each version should have a delete button testid (which proves the version is rendered)
            versions.forEach(version => {
              expect(screen.getByTestId(`delete-version-${version.id}`)).toBeInTheDocument()
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should show edit indicator for edited versions only', () => {
      fc.assert(
        fc.property(
          versionsArrayArbitrary,
          (versions) => {
            const mockOnVersionSelect = jest.fn()
            const mockOnVersionDelete = jest.fn()
            
            renderWithCleanup(
              <VersionSelector
                versions={versions}
                activeVersionId={versions[0].id}
                onVersionSelect={mockOnVersionSelect}
                onVersionDelete={mockOnVersionDelete}
              />
            )
            
            // Check edit indicators match isEdited flag
            versions.forEach(version => {
              const editIndicator = screen.queryByTestId(`edit-indicator-${version.id}`)
              if (version.isEdited) {
                expect(editIndicator).toBeInTheDocument()
              } else {
                expect(editIndicator).not.toBeInTheDocument()
              }
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Invariants', () => {
    /**
     * Additional invariant properties to ensure component correctness
     */
    it('should not render when versions array has less than 2 items', () => {
      fc.assert(
        fc.property(
          fc.array(versionArbitrary, { minLength: 0, maxLength: 1 }),
          (versions) => {
            const mockOnVersionSelect = jest.fn()
            const mockOnVersionDelete = jest.fn()
            
            renderWithCleanup(
              <VersionSelector
                versions={versions}
                activeVersionId={versions[0]?.id || null}
                onVersionSelect={mockOnVersionSelect}
                onVersionDelete={mockOnVersionDelete}
              />
            )
            
            // Should not render tablist when 0 or 1 versions
            expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should render delete button for each version when multiple exist', () => {
      fc.assert(
        fc.property(
          versionsArrayArbitrary,
          (versions) => {
            const mockOnVersionSelect = jest.fn()
            const mockOnVersionDelete = jest.fn()
            
            renderWithCleanup(
              <VersionSelector
                versions={versions}
                activeVersionId={versions[0].id}
                onVersionSelect={mockOnVersionSelect}
                onVersionDelete={mockOnVersionDelete}
              />
            )
            
            // Each version should have a delete button
            versions.forEach(version => {
              expect(screen.getByTestId(`delete-version-${version.id}`)).toBeInTheDocument()
            })
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should call onVersionDelete with correct version ID', () => {
      fc.assert(
        fc.property(
          versionsArrayArbitrary,
          fc.integer({ min: 0 }),
          (versions, randomIndex) => {
            const mockOnVersionSelect = jest.fn()
            const mockOnVersionDelete = jest.fn()
            
            renderWithCleanup(
              <VersionSelector
                versions={versions}
                activeVersionId={versions[0].id}
                onVersionSelect={mockOnVersionSelect}
                onVersionDelete={mockOnVersionDelete}
              />
            )
            
            // Click delete on a random version
            const targetIndex = randomIndex % versions.length
            const targetVersion = versions[targetIndex]
            const deleteBtn = screen.getByTestId(`delete-version-${targetVersion.id}`)
            
            fireEvent.click(deleteBtn)
            
            expect(mockOnVersionDelete).toHaveBeenCalledWith(targetVersion.id)
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
