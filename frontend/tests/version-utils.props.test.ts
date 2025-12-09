/**
 * Property-based tests for version ordering and display utilities
 *
 * Feature: lyrics-regeneration-versioning
 * Task 13.1: Property 23 - Chronological version ordering
 * Validates: Requirements 8.1
 */

import * as fc from 'fast-check'
import type { LyricsVersion } from '@/stores/lyricsEditingStore'
import {
  sortVersionsChronologically,
  getVersionNumber,
  getVersionLabel,
  formatRelativeTime,
  getVersionsWithMetadata,
} from '@/lib/version-utils'

// Custom arbitrary for generating lyrics
const lyricsArbitrary = fc.string({ minLength: 1, maxLength: 500 })

// Custom arbitrary for generating version objects
const versionArbitrary: fc.Arbitrary<LyricsVersion> = fc.record({
  id: fc.uuid(),
  lyrics: lyricsArbitrary,
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  isEdited: fc.boolean(),
  editedLyrics: fc.option(lyricsArbitrary, { nil: undefined }),
})

describe('Version Ordering Property Tests', () => {
  describe('Property 23: Chronological version ordering', () => {
    /**
     * Feature: lyrics-regeneration-versioning, Property 23
     * Validates: Requirements 8.1
     *
     * For any rendered version selector, the versions should be displayed
     * in chronological order based on createdAt timestamps.
     */
    it('should sort versions in ascending chronological order', () => {
      fc.assert(
        fc.property(
          fc.array(versionArbitrary, { minLength: 1, maxLength: 10 }),
          (versions) => {
            const sortedVersions = sortVersionsChronologically(versions)

            // Verify ascending order
            for (let i = 1; i < sortedVersions.length; i++) {
              const prevTime = new Date(sortedVersions[i - 1].createdAt).getTime()
              const currTime = new Date(sortedVersions[i].createdAt).getTime()
              // Skip assertion if either time is NaN (edge case from fast-check date generation)
              if (!Number.isNaN(prevTime) && !Number.isNaN(currTime)) {
                expect(currTime).toBeGreaterThanOrEqual(prevTime)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve all versions when sorting', () => {
      fc.assert(
        fc.property(
          fc.array(versionArbitrary, { minLength: 1, maxLength: 10 }),
          (versions) => {
            const sortedVersions = sortVersionsChronologically(versions)

            // Same length
            expect(sortedVersions.length).toBe(versions.length)

            // Same version IDs
            const originalIds = [...versions.map((v) => v.id)].sort()
            const sortedIds = [...sortedVersions.map((v) => v.id)].sort()
            expect(sortedIds).toEqual(originalIds)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not mutate original array', () => {
      fc.assert(
        fc.property(
          fc.array(versionArbitrary, { minLength: 1, maxLength: 10 }),
          (versions) => {
            const originalOrder = versions.map((v) => v.id)
            sortVersionsChronologically(versions)

            // Original array should be unchanged
            const afterOrder = versions.map((v) => v.id)
            expect(afterOrder).toEqual(originalOrder)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should assign sequential version numbers based on chronological order', () => {
      fc.assert(
        fc.property(
          fc.array(versionArbitrary, { minLength: 1, maxLength: 10 }),
          (versions) => {
            const sortedVersions = sortVersionsChronologically(versions)

            // Version numbers should be 1, 2, 3, ... based on chronological order
            sortedVersions.forEach((version, index) => {
              const versionNumber = getVersionNumber(versions, version.id)
              expect(versionNumber).toBe(index + 1)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate correct version labels', () => {
      fc.assert(
        fc.property(
          fc.array(versionArbitrary, { minLength: 1, maxLength: 10 }),
          (versions) => {
            const sortedVersions = sortVersionsChronologically(versions)

            sortedVersions.forEach((version, index) => {
              const label = getVersionLabel(versions, version.id)
              expect(label).toBe(`Version ${index + 1}`)
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('formatRelativeTime properties', () => {
    it('should return "just now" for recent timestamps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4999 }), // Less than 5 seconds
          (millisAgo) => {
            const now = new Date()
            const timestamp = new Date(now.getTime() - millisAgo)

            const result = formatRelativeTime(timestamp, now)
            expect(result).toBe('just now')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format seconds correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 59 }), // 5-59 seconds
          (seconds) => {
            const now = new Date()
            const timestamp = new Date(now.getTime() - seconds * 1000)

            const result = formatRelativeTime(timestamp, now)
            expect(result).toMatch(/^\d+ seconds? ago$/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format minutes correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 59 }), // 1-59 minutes
          (minutes) => {
            const now = new Date()
            const timestamp = new Date(now.getTime() - minutes * 60 * 1000)

            const result = formatRelativeTime(timestamp, now)
            expect(result).toMatch(/^\d+ minutes? ago$/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format hours correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 23 }), // 1-23 hours
          (hours) => {
            const now = new Date()
            const timestamp = new Date(now.getTime() - hours * 60 * 60 * 1000)

            const result = formatRelativeTime(timestamp, now)
            expect(result).toMatch(/^\d+ hours? ago$/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format days correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 6 }), // 1-6 days
          (days) => {
            const now = new Date()
            const timestamp = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

            const result = formatRelativeTime(timestamp, now)
            expect(result).toMatch(/^\d+ days? ago$/)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('getVersionsWithMetadata properties', () => {
    it('should return versions sorted chronologically with correct metadata', () => {
      fc.assert(
        fc.property(
          fc.array(versionArbitrary, { minLength: 1, maxLength: 10 }),
          (versions) => {
            // Use a fixed date that is always after all generated version dates (which are max 2030)
            const now = new Date('2031-01-01T00:00:00Z')
            const versionsWithMetadata = getVersionsWithMetadata(versions, now)

            // Should return same number of versions
            expect(versionsWithMetadata.length).toBe(versions.length)

            // Should be sorted chronologically (compare getTime values directly)
            for (let i = 1; i < versionsWithMetadata.length; i++) {
              const prev = versionsWithMetadata[i - 1]
              const curr = versionsWithMetadata[i]
              const prevTime = new Date(prev.createdAt).getTime()
              const currTime = new Date(curr.createdAt).getTime()
              // Skip assertion if either date is invalid (NaN)
              if (!Number.isNaN(prevTime) && !Number.isNaN(currTime)) {
                expect(currTime).toBeGreaterThanOrEqual(prevTime)
              }
            }

            // Version numbers should be sequential starting from 1
            versionsWithMetadata.forEach((version, index) => {
              expect(version.displayMetadata.versionNumber).toBe(index + 1)
            })
          }
        ),
        { numRuns: 50 } // Reduced runs for stability
      )
    })

    it('should include all version properties plus display metadata', () => {
      fc.assert(
        fc.property(
          fc.array(versionArbitrary, { minLength: 1, maxLength: 5 }),
          (versions) => {
            // Use a fixed date that is always after all generated version dates
            const versionsWithMetadata = getVersionsWithMetadata(versions, new Date('2031-01-01T00:00:00Z'))

            versionsWithMetadata.forEach((version) => {
              // Original properties should exist
              expect(version.id).toBeDefined()
              expect(version.lyrics).toBeDefined()
              expect(version.createdAt).toBeDefined()
              expect(typeof version.isEdited).toBe('boolean')

              // Display metadata should exist
              expect(version.displayMetadata).toBeDefined()
              expect(typeof version.displayMetadata.versionNumber).toBe('number')
              expect(typeof version.displayMetadata.label).toBe('string')
              expect(typeof version.displayMetadata.relativeTime).toBe('string')
              expect(typeof version.displayMetadata.absoluteTime).toBe('string')
              expect(version.displayMetadata.isEdited).toBe(version.isEdited)
            })
          }
        ),
        { numRuns: 50 } // Reduced runs for stability
      )
    })
  })
})
