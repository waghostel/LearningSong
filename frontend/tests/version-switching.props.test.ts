/**
 * Property-based tests for version switching logic
 *
 * Feature: lyrics-regeneration-versioning
 * Tasks 7.1, 7.2, 7.3: Property tests for version switching
 *
 * Properties tested:
 * - Property 7: Active version indicator synchronization (Requirements: 2.4)
 * - Property 16: Edit preservation during switch (Requirements: 5.3)
 * - Property 17: Edited content restoration (Requirements: 5.4)
 */

import * as fc from 'fast-check'
import { renderHook, act } from '@testing-library/react'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'

// Custom arbitrary for generating lyrics
const lyricsArbitrary = fc.string({ minLength: 1, maxLength: 500 })

describe('Version Switching Property Tests', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()

    // Reset store to initial state
    const { result } = renderHook(() => useLyricsEditingStore())
    act(() => {
      result.current.reset()
    })
  })

  describe('Property 7: Active version indicator synchronization', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 7
     * Validates: Requirements 2.4
     *
     * When a user switches to a previous version, the activeVersionId should
     * be updated to match the selected version's ID.
     */
    it('should update activeVersionId to match selected version', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 2, maxLength: 8 }),
          fc.integer({ min: 0, max: 7 }),
          (lyricsArray, selectIndex) => {
            const safeSelectIndex = selectIndex % lyricsArray.length

            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add multiple versions
            lyricsArray.forEach((lyrics) => {
              act(() => {
                result.current.addVersion(lyrics)
              })
            })

            // Get version to select
            const targetVersion = result.current.versions[safeSelectIndex]

            // Switch to target version
            act(() => {
              result.current.setActiveVersion(targetVersion.id)
            })

            // Verify activeVersionId is synchronized
            expect(result.current.activeVersionId).toBe(targetVersion.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should update editedLyrics to match selected version content', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 2, maxLength: 8 }),
          fc.integer({ min: 0, max: 7 }),
          (lyricsArray, selectIndex) => {
            const safeSelectIndex = selectIndex % lyricsArray.length

            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add multiple versions
            lyricsArray.forEach((lyrics) => {
              act(() => {
                result.current.addVersion(lyrics)
              })
            })

            // Get version to select
            const targetVersion = result.current.versions[safeSelectIndex]

            // Switch to target version
            act(() => {
              result.current.setActiveVersion(targetVersion.id)
            })

            // editedLyrics should match the version's lyrics (or editedLyrics if present)
            const expectedLyrics = targetVersion.editedLyrics || targetVersion.lyrics
            expect(result.current.editedLyrics).toBe(expectedLyrics)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should update originalLyrics to match selected version base lyrics', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 2, maxLength: 5 }),
          fc.integer({ min: 0, max: 4 }),
          (lyricsArray, selectIndex) => {
            const safeSelectIndex = selectIndex % lyricsArray.length

            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add multiple versions
            lyricsArray.forEach((lyrics) => {
              act(() => {
                result.current.addVersion(lyrics)
              })
            })

            // Get version to select
            const targetVersion = result.current.versions[safeSelectIndex]

            // Switch to target version
            act(() => {
              result.current.setActiveVersion(targetVersion.id)
            })

            // originalLyrics should match the version's base lyrics
            expect(result.current.originalLyrics).toBe(targetVersion.lyrics)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 16: Edit preservation during switch', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 16
     * Validates: Requirements 5.3
     *
     * When a user switches away from an edited version, the modifications
     * should be saved to that version before switching.
     */
    it('should save edits to current version before switching', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          lyricsArbitrary,
          lyricsArbitrary,
          (lyrics1, lyrics2, editedContent) => {
            // Skip if edited content matches original
            if (lyrics2 === editedContent) return

            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add two versions
            act(() => {
              result.current.addVersion(lyrics1)
              result.current.addVersion(lyrics2)
            })

            const version1Id = result.current.versions[0].id
            const version2Id = result.current.versions[1].id

            // Currently active is version2 (most recent)
            expect(result.current.activeVersionId).toBe(version2Id)

            // Edit the current lyrics (version 2)
            act(() => {
              result.current.setEditedLyrics(editedContent)
            })

            // Switch to version 1
            act(() => {
              result.current.setActiveVersion(version1Id)
            })

            // Version 2 should now have the edits preserved
            const version2 = result.current.versions.find((v) => v.id === version2Id)
            expect(version2?.isEdited).toBe(true)
            expect(version2?.editedLyrics).toBe(editedContent)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not mark version as edited if content matches original', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          lyricsArbitrary,
          (lyrics1, lyrics2) => {
            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add two versions
            act(() => {
              result.current.addVersion(lyrics1)
              result.current.addVersion(lyrics2)
            })

            const version1Id = result.current.versions[0].id
            const version2Id = result.current.versions[1].id

            // Set editedLyrics to same as version 2's original (no actual change)
            act(() => {
              result.current.setEditedLyrics(lyrics2)
            })

            // Switch to version 1
            act(() => {
              result.current.setActiveVersion(version1Id)
            })

            // Version 2 should NOT be marked as edited
            const version2 = result.current.versions.find((v) => v.id === version2Id)
            expect(version2?.isEdited).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve edits across multiple switches', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          lyricsArbitrary,
          lyricsArbitrary,
          lyricsArbitrary,
          (lyrics1, lyrics2, edit1, edit2) => {
            // Skip if edits match originals
            if (lyrics1 === edit1 || lyrics2 === edit2) return

            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add two versions
            act(() => {
              result.current.addVersion(lyrics1)
              result.current.addVersion(lyrics2)
            })

            const version1Id = result.current.versions[0].id
            const version2Id = result.current.versions[1].id

            // Edit version 2
            act(() => {
              result.current.setEditedLyrics(edit2)
            })

            // Switch to version 1
            act(() => {
              result.current.setActiveVersion(version1Id)
            })

            // Edit version 1
            act(() => {
              result.current.setEditedLyrics(edit1)
            })

            // Switch back to version 2
            act(() => {
              result.current.setActiveVersion(version2Id)
            })

            // Switch back to version 1
            act(() => {
              result.current.setActiveVersion(version1Id)
            })

            // Both versions should have their edits preserved
            const v1 = result.current.versions.find((v) => v.id === version1Id)
            const v2 = result.current.versions.find((v) => v.id === version2Id)

            expect(v1?.isEdited).toBe(true)
            expect(v1?.editedLyrics).toBe(edit1)
            expect(v2?.isEdited).toBe(true)
            expect(v2?.editedLyrics).toBe(edit2)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 17: Edited content restoration', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 17
     * Validates: Requirements 5.4
     *
     * When a user switches back to an edited version, the editedLyrics
     * should be restored (not the original lyrics).
     */
    it('should restore editedLyrics when switching back to edited version', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          lyricsArbitrary,
          lyricsArbitrary,
          (lyrics1, lyrics2, editedContent) => {
            // Skip if edited content matches original
            if (lyrics1 === editedContent) return

            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add version 1 and edit it
            act(() => {
              result.current.addVersion(lyrics1)
            })

            const version1Id = result.current.versions[0].id

            act(() => {
              result.current.updateVersionEdits(version1Id, editedContent)
            })

            // Add version 2 (switches to it)
            act(() => {
              result.current.addVersion(lyrics2)
            })

            // Switch back to version 1
            act(() => {
              result.current.setActiveVersion(version1Id)
            })

            // editedLyrics should be the previously edited content, not original
            expect(result.current.editedLyrics).toBe(editedContent)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should restore original lyrics when switching to unedited version', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          lyricsArbitrary,
          (lyrics1, lyrics2) => {
            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add two versions without editing
            act(() => {
              result.current.addVersion(lyrics1)
              result.current.addVersion(lyrics2)
            })

            const version1Id = result.current.versions[0].id

            // Switch to version 1
            act(() => {
              result.current.setActiveVersion(version1Id)
            })

            // editedLyrics should be the original lyrics
            expect(result.current.editedLyrics).toBe(lyrics1)
            expect(result.current.originalLyrics).toBe(lyrics1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly differentiate between edited and unedited version content', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 3, maxLength: 5 }),
          fc.integer({ min: 0, max: 4 }),
          lyricsArbitrary,
          (lyricsArray, editIndex, editedContent) => {
            const safeEditIndex = editIndex % lyricsArray.length

            // Skip if edited content matches original
            if (lyricsArray[safeEditIndex] === editedContent) return

            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add versions
            lyricsArray.forEach((lyrics) => {
              act(() => {
                result.current.addVersion(lyrics)
              })
            })

            // Edit one specific version
            const editedVersionId = result.current.versions[safeEditIndex].id
            act(() => {
              result.current.setActiveVersion(editedVersionId)
              result.current.updateVersionEdits(editedVersionId, editedContent)
            })

            // Switch to another version, then back
            const otherIndex = (safeEditIndex + 1) % lyricsArray.length
            const otherVersionId = result.current.versions[otherIndex].id

            act(() => {
              result.current.setActiveVersion(otherVersionId)
            })

            // Verify other version shows original content
            const otherVersion = result.current.versions.find((v) => v.id === otherVersionId)
            if (!otherVersion?.isEdited) {
              expect(result.current.editedLyrics).toBe(otherVersion?.lyrics)
            }

            // Switch back to edited version
            act(() => {
              result.current.setActiveVersion(editedVersionId)
            })

            // Verify edited version shows edited content
            expect(result.current.editedLyrics).toBe(editedContent)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
