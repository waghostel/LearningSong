/**
 * Property-based tests for song generation with version management
 *
 * Feature: lyrics-regeneration-versioning
 * Task 10.1: Property test for song generation uses active version
 *
 * Properties tested:
 * - Property 12: Song generation uses active version (Requirements: 4.3, 5.5)
 */

import * as fc from 'fast-check'
import { renderHook, act } from '@testing-library/react'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'

// Custom arbitrary for generating lyrics
const lyricsArbitrary = fc.string({ minLength: 1, maxLength: 500 })

describe('Song Generation Version Property Tests', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()

    // Reset store to initial state
    const { result } = renderHook(() => useLyricsEditingStore())
    act(() => {
      result.current.reset()
    })
  })

  describe('Property 12: Song generation uses active version', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 12
     * Validates: Requirements 4.3, 5.5
     *
     * When generating a song, the system should use the active version's
     * editedLyrics (if present) or original lyrics. This ensures that
     * the user's selected version and any manual edits are used for
     * song generation.
     */
    it('should use active version original lyrics when no edits exist', () => {
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

            // Select a specific version
            const targetVersion = result.current.versions[safeSelectIndex]
            act(() => {
              result.current.setActiveVersion(targetVersion.id)
            })

            // The editedLyrics in store should match the version's original lyrics
            // (since no edits were made)
            expect(result.current.editedLyrics).toBe(targetVersion.lyrics)
            
            // Verify the active version is correct
            expect(result.current.activeVersionId).toBe(targetVersion.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should use active version edited lyrics when edits exist', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 2, maxLength: 5 }),
          fc.integer({ min: 0, max: 4 }),
          lyricsArbitrary,
          (lyricsArray, selectIndex, editedContent) => {
            const safeSelectIndex = selectIndex % lyricsArray.length

            // Skip if edited content matches original
            if (lyricsArray[safeSelectIndex] === editedContent) return

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

            // Select a specific version and edit it
            const targetVersion = result.current.versions[safeSelectIndex]
            act(() => {
              result.current.setActiveVersion(targetVersion.id)
              result.current.updateVersionEdits(targetVersion.id, editedContent)
            })

            // The editedLyrics in store should match the edited content
            expect(result.current.editedLyrics).toBe(editedContent)
            
            // Verify the version is marked as edited
            const updatedVersion = result.current.versions.find(v => v.id === targetVersion.id)
            expect(updatedVersion?.isEdited).toBe(true)
            expect(updatedVersion?.editedLyrics).toBe(editedContent)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should use correct lyrics after switching between versions', () => {
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

            // Edit version 2 (currently active)
            act(() => {
              result.current.updateVersionEdits(version2Id, edit2)
            })

            // Verify version 2's edited lyrics are in store
            expect(result.current.editedLyrics).toBe(edit2)

            // Switch to version 1
            act(() => {
              result.current.setActiveVersion(version1Id)
            })

            // Verify version 1's original lyrics are in store
            expect(result.current.editedLyrics).toBe(lyrics1)

            // Edit version 1
            act(() => {
              result.current.updateVersionEdits(version1Id, edit1)
            })

            // Verify version 1's edited lyrics are in store
            expect(result.current.editedLyrics).toBe(edit1)

            // Switch back to version 2
            act(() => {
              result.current.setActiveVersion(version2Id)
            })

            // Verify version 2's edited lyrics are restored
            expect(result.current.editedLyrics).toBe(edit2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain correct lyrics when switching to unedited version', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          lyricsArbitrary,
          lyricsArbitrary,
          (lyrics1, lyrics2, edit1) => {
            // Skip if edit matches original
            if (lyrics1 === edit1) return

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

            // Edit version 1
            act(() => {
              result.current.setActiveVersion(version1Id)
              result.current.updateVersionEdits(version1Id, edit1)
            })

            // Switch to version 2 (unedited)
            act(() => {
              result.current.setActiveVersion(version2Id)
            })

            // Verify version 2's original lyrics are in store (not edited)
            expect(result.current.editedLyrics).toBe(lyrics2)
            
            const v2 = result.current.versions.find(v => v.id === version2Id)
            expect(v2?.isEdited).toBe(false)
            expect(v2?.editedLyrics).toBeUndefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should use fallback to editedLyrics when no versions exist', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          (lyrics) => {
            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Set lyrics without creating versions (legacy behavior)
            act(() => {
              result.current.setOriginalLyrics(lyrics)
            })

            // Verify editedLyrics is set
            expect(result.current.editedLyrics).toBe(lyrics)
            
            // Verify no versions exist
            expect(result.current.versions.length).toBe(0)
            expect(result.current.activeVersionId).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
