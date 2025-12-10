/**
 * Property-based tests for Accessibility features
 * 
 * Feature: lyrics-regeneration-versioning, Task 11
 * Using fast-check for property-based testing of accessibility behaviors
 * 
 * Properties tested:
 * - Property 24: Keyboard navigation support (Requirements: 8.3)
 * - Property 25: Screen reader announcements and ARIA attributes (Requirements: 8.5)
 */

import * as fc from 'fast-check'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { VersionSelector } from '@/components/VersionSelector'
import type { LyricsVersion } from '@/stores/lyricsEditingStore'
import * as React from 'react'

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

describe('Accessibility Property Tests', () => {
  // Cleanup after each test case
  afterEach(() => {
    cleanup()
  })

  describe('Property 24: Keyboard navigation support', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 24
     * Validates: Requirements 8.3
     * 
     * Arrow keys should move focus cyclically between tabs.
     * Home/End keys should move focus to first/last tab.
     */
    it('should navigate tabs with arrow keys', () => {
      fc.assert(
        fc.property(
          versionsArrayArbitrary,
          fc.array(fc.constantFrom('ArrowRight', 'ArrowLeft'), { minLength: 1, maxLength: 20 }),
          (versions, keys) => {
            const mockOnVersionSelect = jest.fn()
            const mockOnVersionDelete = jest.fn()
            
            // Sort versions to match component logic
            // Note: Component logic sorts by createdAt asc
            const sortedVersions = [...versions].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
            
            const activeVersion = sortedVersions[0]
            
            renderWithCleanup(
              <VersionSelector
                versions={versions}
                activeVersionId={activeVersion.id}
                onVersionSelect={mockOnVersionSelect}
                onVersionDelete={mockOnVersionDelete}
              />
            )
            
            // Start focus on first tab
            const firstTab = document.getElementById(`version-tab-${sortedVersions[0].id}`)
            if (!firstTab) throw new Error('First tab not found')
            firstTab.focus()
            
            let currentIndex = 0
            
            keys.forEach(key => {
                fireEvent.keyDown(document.activeElement || firstTab, { key })
                
                if (key === 'ArrowRight') {
                    currentIndex = (currentIndex + 1) % sortedVersions.length
                } else {
                    currentIndex = (currentIndex - 1 + sortedVersions.length) % sortedVersions.length
                }
                
                const expectedTab = document.getElementById(`version-tab-${sortedVersions[currentIndex].id}`)
                expect(document.activeElement).toBe(expectedTab)
            })
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should navigate to start/end with Home/End keys', () => {
        fc.assert(
          fc.property(
            versionsArrayArbitrary,
            fc.integer({ min: 0 }),
            (versions, randomIndex) => {
              const mockOnVersionSelect = jest.fn()
              const mockOnVersionDelete = jest.fn()
              
              const sortedVersions = [...versions].sort(
                  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              )
              
              const activeVersion = sortedVersions[0]
              
              renderWithCleanup(
                <VersionSelector
                  versions={versions}
                  activeVersionId={activeVersion.id}
                  onVersionSelect={mockOnVersionSelect}
                  onVersionDelete={mockOnVersionDelete}
                />
              )
              
              const startTab = document.getElementById(`version-tab-${sortedVersions[randomIndex % sortedVersions.length].id}`)
              if (!startTab) throw new Error('Start tab not found')
              startTab.focus()
              
              // Press End
              fireEvent.keyDown(startTab, { key: 'End' })
              const endTab = document.getElementById(`version-tab-${sortedVersions[sortedVersions.length - 1].id}`)
              expect(document.activeElement).toBe(endTab)
              
              // Press Home
              fireEvent.keyDown(endTab || startTab, { key: 'Home' })
              const homeTab = document.getElementById(`version-tab-${sortedVersions[0].id}`)
              expect(document.activeElement).toBe(homeTab)
              
              return true
            }
          ),
          { numRuns: 50 }
        )
      })

      it('should trigger delete with Delete key', () => {
        fc.assert(
          fc.property(
            versionsArrayArbitrary,
            fc.integer({ min: 0 }),
            (versions, randomIndex) => {
              const mockOnVersionSelect = jest.fn()
              const mockOnVersionDelete = jest.fn()
              
              const sortedVersions = [...versions].sort(
                  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              )
              
              const targetIndex = randomIndex % sortedVersions.length
              const targetVersion = sortedVersions[targetIndex]
              
              renderWithCleanup(
                <VersionSelector
                  versions={versions}
                  activeVersionId={sortedVersions[0].id}
                  onVersionSelect={mockOnVersionSelect}
                  onVersionDelete={mockOnVersionDelete}
                />
              )
              
              const targetTab = document.getElementById(`version-tab-${targetVersion.id}`)
              if (!targetTab) throw new Error('Target tab not found')
              targetTab.focus()
              
              fireEvent.keyDown(targetTab, { key: 'Delete' })
              
              expect(mockOnVersionDelete).toHaveBeenCalledWith(targetVersion.id)
              
              return true
            }
          ),
          { numRuns: 50 }
        )
      })
  })

  describe('Property 25: Screen reader announcements', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 25
     * Validates: Requirements 8.5
     * 
     * Component should have proper ARIA attributes.
     */
    it('should have correct ARIA structural roles and attributes', () => {
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
            
            const list = screen.getByRole('tablist')
            expect(list).toHaveAttribute('aria-orientation', 'horizontal')
            expect(list).toHaveAttribute('aria-live', 'polite')
            
            const tabs = screen.getAllByRole('tab')
            tabs.forEach(tab => {
                expect(tab).toHaveAttribute('aria-selected')
                expect(tab).toHaveAttribute('aria-controls')
                // Note: We are now allowing aria-keyshortcuts="Delete"
                // but checking it specifically might be good
                expect(tab).toHaveAttribute('aria-keyshortcuts', 'Delete')
            })
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
