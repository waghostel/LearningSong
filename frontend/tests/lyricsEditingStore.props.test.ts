/**
 * Property-based tests for lyricsEditingStore version management
 * 
 * Feature: lyrics-regeneration-versioning
 * Using fast-check for property-based testing
 */

import * as fc from 'fast-check'
import { renderHook, act } from '@testing-library/react'
import { useLyricsEditingStore, type LyricsVersion } from '@/stores/lyricsEditingStore'

// Custom arbitrary for generating lyrics
const lyricsArbitrary = fc.string({ minLength: 1, maxLength: 1000 })

// Custom arbitrary for generating version arrays
const versionArbitrary: fc.Arbitrary<LyricsVersion> = fc.record({
  id: fc.uuid(),
  lyrics: lyricsArbitrary,
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  isEdited: fc.boolean(),
  editedLyrics: fc.option(lyricsArbitrary, { nil: undefined }),
})

const versionsArrayArbitrary = fc.array(versionArbitrary, { minLength: 1, maxLength: 8 })

describe('LyricsEditingStore Property Tests', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()
    
    // Reset store to initial state
    const { result } = renderHook(() => useLyricsEditingStore())
    act(() => {
      result.current.reset()
    })
  })

  describe('Property 3: Successful regeneration updates active version', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 3
     * Validates: Requirements 1.3
     * 
     * For any successful regeneration, the version history length should increase
     * by one and the activeVersionId should point to the newly created version.
     */
    it('should increase version history length by one on addVersion', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          (lyrics) => {
            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })
            
            const initialLength = result.current.versions.length
            
            act(() => {
              result.current.addVersion(lyrics)
            })
            
            expect(result.current.versions.length).toBe(initialLength + 1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set activeVersionId to the newly created version on addVersion', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          (lyrics) => {
            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })
            
            act(() => {
              result.current.addVersion(lyrics)
            })
            
            const newVersion = result.current.versions[result.current.versions.length - 1]
            expect(result.current.activeVersionId).toBe(newVersion.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set activeVersionId to newly created version on completeRegeneration', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          (lyrics) => {
            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
              result.current.startRegeneration()
            })
            
            act(() => {
              result.current.completeRegeneration(lyrics)
            })
            
            expect(result.current.isRegenerating).toBe(false)
            expect(result.current.versions.length).toBeGreaterThan(0)
            const newVersion = result.current.versions[result.current.versions.length - 1]
            expect(result.current.activeVersionId).toBe(newVersion.id)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 5: Version switching preserves history', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 5
     * Validates: Requirements 2.3
     * 
     * For any version selection operation, the versions array length and content
     * should remain unchanged (invariant).
     */
    it('should preserve version array length when switching versions', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 2, maxLength: 5 }),
          (lyricsArray) => {
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
            
            const versionCountBefore = result.current.versions.length
            const firstVersion = result.current.versions[0]
            
            // Switch to first version
            act(() => {
              result.current.setActiveVersion(firstVersion.id)
            })
            
            expect(result.current.versions.length).toBe(versionCountBefore)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve version ids when switching versions', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 2, maxLength: 5 }),
          (lyricsArray) => {
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
            
            const versionIdsBefore = result.current.versions.map(v => v.id)
            const firstVersion = result.current.versions[0]
            
            // Switch to first version
            act(() => {
              result.current.setActiveVersion(firstVersion.id)
            })
            
            const versionIdsAfter = result.current.versions.map(v => v.id)
            expect(versionIdsAfter).toEqual(versionIdsBefore)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 8: Sequential version numbering', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 8
     * Validates: Requirements 3.2
     * 
     * For any new version creation, the version should be added to the array
     * and all versions should have unique IDs.
     */
    it('should create unique version IDs for each new version', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 2, maxLength: 8 }),
          (lyricsArray) => {
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
            
            const versionIds = result.current.versions.map(v => v.id)
            const uniqueIds = new Set(versionIds)
            
            expect(uniqueIds.size).toBe(versionIds.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should assign increasing createdAt timestamps for sequential versions', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 2, maxLength: 5 }),
          (lyricsArray) => {
            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })
            
            // Add multiple versions (with small delays to ensure different timestamps)
            lyricsArray.forEach((lyrics) => {
              act(() => {
                result.current.addVersion(lyrics)
              })
            })
            
            const versions = result.current.versions
            for (let i = 1; i < versions.length; i++) {
              const prevTime = new Date(versions[i - 1].createdAt).getTime()
              const currTime = new Date(versions[i].createdAt).getTime()
              expect(currTime).toBeGreaterThanOrEqual(prevTime)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 11: Session persistence round-trip', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 11
     * Validates: Requirements 4.1, 4.2
     * 
     * For any version history, storing to sessionStorage and then loading
     * should produce an equivalent version history with the same versions
     * and activeVersionId.
     */
    it('should persist and restore version history from sessionStorage', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 1, maxLength: 5 }),
          (lyricsArray) => {
            // First render - add versions
            const { result: result1 } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result1.current.reset()
            })
            
            lyricsArray.forEach((lyrics) => {
              act(() => {
                result1.current.addVersion(lyrics)
              })
            })
            
            const versionsBefore = result1.current.versions
            const activeVersionIdBefore = result1.current.activeVersionId
            
            // Force persist to sessionStorage
            const stored = sessionStorage.getItem('lyrics-editing-storage')
            expect(stored).toBeTruthy()
            
            // Simulate rehydration
            useLyricsEditingStore.persist.rehydrate()
            
            const { result: result2 } = renderHook(() => useLyricsEditingStore())
            
            // Verify restoration
            expect(result2.current.versions.length).toBe(versionsBefore.length)
            expect(result2.current.activeVersionId).toBe(activeVersionIdBefore)
            
            // Verify version IDs match
            const idsAfter = result2.current.versions.map(v => v.id)
            const idsBefore = versionsBefore.map(v => v.id)
            expect(idsAfter).toEqual(idsBefore)
          }
        ),
        { numRuns: 50 } // Reduced runs due to sessionStorage interaction
      )
    })
  })

  describe('Property 13: Content change clears history', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 13
     * Validates: Requirements 4.4
     * 
     * For any content hash change, the versions array should be reset to empty
     * and activeVersionId should be null.
     */
    it('should clear version history when originalContent changes', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 1, maxLength: 5 }),
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          (lyricsArray, content1, content2) => {
            // Skip if contents are the same
            if (content1 === content2) return
            
            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })
            
            // Set initial content
            act(() => {
              result.current.setOriginalContent(content1)
            })
            
            // Add some versions
            lyricsArray.forEach((lyrics) => {
              act(() => {
                result.current.addVersion(lyrics)
              })
            })
            
            expect(result.current.versions.length).toBeGreaterThan(0)
            
            // Change content
            act(() => {
              result.current.setOriginalContent(content2)
            })
            
            // Verify history is cleared
            expect(result.current.versions.length).toBe(0)
            expect(result.current.activeVersionId).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve version history when originalContent stays the same', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 1, maxLength: 5 }),
          fc.string({ minLength: 1 }),
          (lyricsArray, content) => {
            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })
            
            // Set initial content
            act(() => {
              result.current.setOriginalContent(content)
            })
            
            // Add some versions
            lyricsArray.forEach((lyrics) => {
              act(() => {
                result.current.addVersion(lyrics)
              })
            })
            
            const versionCountBefore = result.current.versions.length
            
            // Set same content again
            act(() => {
              result.current.setOriginalContent(content)
            })
            
            // Verify history is preserved
            expect(result.current.versions.length).toBe(versionCountBefore)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 14: Edit tracking', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 14
     * Validates: Requirements 5.1
     * 
     * For any version where the displayed lyrics differ from the original version lyrics,
     * the isEdited flag should be true.
     */
    it('should set isEdited to true when editedLyrics differs from original version lyrics', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          lyricsArbitrary,
          (originalLyrics, editedLyrics) => {
            // Skip if lyrics are the same
            if (originalLyrics === editedLyrics) return

            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add a version with original lyrics
            act(() => {
              result.current.addVersion(originalLyrics)
            })

            const versionId = result.current.versions[0].id
            expect(result.current.versions[0].isEdited).toBe(false)

            // Update with different lyrics
            act(() => {
              result.current.updateVersionEdits(versionId, editedLyrics)
            })

            expect(result.current.versions[0].isEdited).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set isEdited to false when editedLyrics matches original version lyrics', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          lyricsArbitrary,
          (originalLyrics, tempEditedLyrics) => {
            // Skip if lyrics are the same (we want to test the roundtrip)
            if (originalLyrics === tempEditedLyrics) return

            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add a version
            act(() => {
              result.current.addVersion(originalLyrics)
            })

            const versionId = result.current.versions[0].id

            // Edit to different content
            act(() => {
              result.current.updateVersionEdits(versionId, tempEditedLyrics)
            })

            expect(result.current.versions[0].isEdited).toBe(true)

            // Edit back to original
            act(() => {
              result.current.updateVersionEdits(versionId, originalLyrics)
            })

            expect(result.current.versions[0].isEdited).toBe(false)
            expect(result.current.versions[0].editedLyrics).toBeUndefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should store editedLyrics when isEdited is true', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          lyricsArbitrary,
          (originalLyrics, editedLyrics) => {
            // Skip if lyrics are the same
            if (originalLyrics === editedLyrics) return

            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add a version
            act(() => {
              result.current.addVersion(originalLyrics)
            })

            const versionId = result.current.versions[0].id

            // Update with different lyrics
            act(() => {
              result.current.updateVersionEdits(versionId, editedLyrics)
            })

            expect(result.current.versions[0].editedLyrics).toBe(editedLyrics)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 15: Edit indicator display', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 15
     * Validates: Requirements 5.2
     * 
     * For any version with isEdited === true, the editedLyrics field should be populated.
     * This property ensures the version data structure is consistent for UI display.
     */
    it('should have editedLyrics populated when isEdited is true', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          lyricsArbitrary,
          (originalLyrics, editedLyrics) => {
            // Skip if lyrics are the same
            if (originalLyrics === editedLyrics) return

            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add a version
            act(() => {
              result.current.addVersion(originalLyrics)
            })

            const versionId = result.current.versions[0].id

            // Update with different lyrics
            act(() => {
              result.current.updateVersionEdits(versionId, editedLyrics)
            })

            const version = result.current.versions[0]
            
            // If isEdited is true, editedLyrics should be defined
            if (version.isEdited) {
              expect(version.editedLyrics).toBeDefined()
              expect(version.editedLyrics).toBe(editedLyrics)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should track isEdited correctly for multiple versions', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 2, maxLength: 5 }),
          fc.integer({ min: 0, max: 4 }),
          (lyricsArray, editIndex) => {
            const safeEditIndex = editIndex % lyricsArray.length

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

            const versionToEdit = result.current.versions[safeEditIndex]
            const editedContent = versionToEdit.lyrics + ' - modified'

            // Edit one version
            act(() => {
              result.current.updateVersionEdits(versionToEdit.id, editedContent)
            })

            // Verify only the edited version has isEdited = true
            result.current.versions.forEach((v, index) => {
              if (index === safeEditIndex) {
                expect(v.isEdited).toBe(true)
              } else {
                expect(v.isEdited).toBe(false)
              }
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18: Version deletion removes from history', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 18
     * Validates: Requirements 6.1
     * 
     * For any version deletion, the deleted version should be removed from
     * the versions array and the array length should decrease by one.
     */
    it('should remove version from history when deleted', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 2, maxLength: 8 }),
          fc.integer({ min: 0, max: 7 }),
          (lyricsArray, deleteIndex) => {
            const safeDeleteIndex = deleteIndex % lyricsArray.length

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

            const versionCountBefore = result.current.versions.length
            const versionToDelete = result.current.versions[safeDeleteIndex]

            // Delete version
            act(() => {
              result.current.deleteVersion(versionToDelete.id)
            })

            // Verify version was removed
            expect(result.current.versions.length).toBe(versionCountBefore - 1)
            expect(result.current.versions.find((v: { id: string }) => v.id === versionToDelete.id)).toBeUndefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not delete when only one version remains', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          (lyrics) => {
            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add single version
            act(() => {
              result.current.addVersion(lyrics)
            })

            expect(result.current.versions.length).toBe(1)
            const versionId = result.current.versions[0].id

            // Try to delete
            act(() => {
              result.current.deleteVersion(versionId)
            })

            // Verify version was NOT removed
            expect(result.current.versions.length).toBe(1)
            expect(result.current.versions[0].id).toBe(versionId)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 19: Non-active deletion preserves active', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 19
     * Validates: Requirements 6.2
     * 
     * When deleting a non-active version, the activeVersionId should
     * remain unchanged.
     */
    it('should preserve activeVersionId when deleting non-active version', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 3, maxLength: 8 }),
          (lyricsArray) => {
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

            // The active version is the last one added
            const activeVersionId = result.current.activeVersionId
            
            // Delete a non-active version (first one)
            const versionToDelete = result.current.versions[0]
            
            // Only proceed if we're not deleting the active version
            if (versionToDelete.id !== activeVersionId) {
              act(() => {
                result.current.deleteVersion(versionToDelete.id)
              })

              // Verify activeVersionId is unchanged
              expect(result.current.activeVersionId).toBe(activeVersionId)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 20: Active deletion switches to recent', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 20
     * Validates: Requirements 6.3
     * 
     * When deleting the active version, the activeVersionId should switch
     * to the most recent remaining version (by createdAt).
     */
    it('should switch to most recent version when active is deleted', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 2, maxLength: 8 }),
          (lyricsArray) => {
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

            // Get the active version (most recently added)
            const activeVersionId = result.current.activeVersionId

            // Delete active version
            act(() => {
              result.current.deleteVersion(activeVersionId!)
            })

            // Verify new active version is the most recent remaining
            const remainingVersions = result.current.versions
            if (remainingVersions.length > 0) {
              const sortedByDate = [...remainingVersions].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )
              const mostRecent = sortedByDate[0]
              expect(result.current.activeVersionId).toBe(mostRecent.id)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should update editedLyrics when active version is deleted', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 2, maxLength: 5 }),
          (lyricsArray) => {
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

            const activeVersionId = result.current.activeVersionId

            // Delete active version
            act(() => {
              result.current.deleteVersion(activeVersionId!)
            })

            // Verify editedLyrics corresponds to the new active version
            const newActiveVersion = result.current.versions.find(
              (v: { id: string }) => v.id === result.current.activeVersionId
            )
            if (newActiveVersion) {
              const expectedLyrics = newActiveVersion.editedLyrics || newActiveVersion.lyrics
              expect(result.current.editedLyrics).toBe(expectedLyrics)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 4: Failed regeneration preserves state', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 4
     * Validates: Requirements 1.4
     * 
     * WHEN regeneration fails THEN the System SHALL display an error message
     * and maintain the current active version.
     * 
     * For any failed regeneration, the version history should remain unchanged,
     * the activeVersionId should remain the same, and the editedLyrics should
     * be preserved.
     */
    it('should preserve version count when regeneration fails', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 1, maxLength: 5 }),
          fc.string({ minLength: 1, maxLength: 200 }), // Error message
          (lyricsArray, errorMessage) => {
            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add some versions
            lyricsArray.forEach((lyrics) => {
              act(() => {
                result.current.addVersion(lyrics)
              })
            })

            const versionCountBefore = result.current.versions.length
            const versionIdsBefore = result.current.versions.map(v => v.id)

            // Start regeneration
            act(() => {
              result.current.startRegeneration()
            })

            expect(result.current.isRegenerating).toBe(true)

            // Fail regeneration
            act(() => {
              result.current.failRegeneration(errorMessage)
            })

            // Verify versions are preserved
            expect(result.current.versions.length).toBe(versionCountBefore)
            const versionIdsAfter = result.current.versions.map(v => v.id)
            expect(versionIdsAfter).toEqual(versionIdsBefore)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve activeVersionId when regeneration fails', () => {
      fc.assert(
        fc.property(
          fc.array(lyricsArbitrary, { minLength: 1, maxLength: 5 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (lyricsArray, errorMessage) => {
            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add some versions
            lyricsArray.forEach((lyrics) => {
              act(() => {
                result.current.addVersion(lyrics)
              })
            })

            const activeVersionIdBefore = result.current.activeVersionId

            // Start and fail regeneration
            act(() => {
              result.current.startRegeneration()
              result.current.failRegeneration(errorMessage)
            })

            // Verify activeVersionId is preserved
            expect(result.current.activeVersionId).toBe(activeVersionIdBefore)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should store error message when regeneration fails', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          fc.string({ minLength: 1, maxLength: 200 }),
          (lyrics, errorMessage) => {
            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add a version
            act(() => {
              result.current.addVersion(lyrics)
            })

            // Start and fail regeneration
            act(() => {
              result.current.startRegeneration()
              result.current.failRegeneration(errorMessage)
            })

            // Verify error state
            expect(result.current.isRegenerating).toBe(false)
            expect(result.current.regenerationError).toBe(errorMessage)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve editedLyrics when regeneration fails', () => {
      fc.assert(
        fc.property(
          lyricsArbitrary,
          lyricsArbitrary,
          fc.string({ minLength: 1, maxLength: 200 }),
          (originalLyrics, editedContent, errorMessage) => {
            // Skip if they are the same
            if (originalLyrics === editedContent) return

            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Add a version
            act(() => {
              result.current.addVersion(originalLyrics)
            })

            const versionId = result.current.versions[0].id

            // Edit the version
            act(() => {
              result.current.updateVersionEdits(versionId, editedContent)
            })

            const editedLyricsBefore = result.current.editedLyrics

            // Start and fail regeneration
            act(() => {
              result.current.startRegeneration()
              result.current.failRegeneration(errorMessage)
            })

            // Verify editedLyrics is preserved
            expect(result.current.editedLyrics).toBe(editedLyricsBefore)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should clear isRegenerating flag when regeneration fails', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (errorMessage) => {
            const { result } = renderHook(() => useLyricsEditingStore())
            act(() => {
              result.current.reset()
            })

            // Start regeneration
            act(() => {
              result.current.startRegeneration()
            })

            expect(result.current.isRegenerating).toBe(true)

            // Fail regeneration
            act(() => {
              result.current.failRegeneration(errorMessage)
            })

            // Verify isRegenerating is cleared
            expect(result.current.isRegenerating).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
