/**
 * Unit tests for version ordering and display utilities
 *
 * Feature: lyrics-regeneration-versioning
 * Task 13.2: Unit tests for version display
 * Requirements: 3.1, 3.2, 3.3, 8.1
 */

import type { LyricsVersion } from '@/stores/lyricsEditingStore'
import {
  sortVersionsChronologically,
  getVersionNumber,
  getVersionLabel,
  formatRelativeTime,
  formatAbsoluteTime,
  getVersionDisplayMetadata,
  getVersionsWithMetadata,
} from '@/lib/version-utils'

// Helper to create test versions
const createTestVersion = (
  id: string,
  lyrics: string,
  createdAt: Date,
  isEdited = false,
  editedLyrics?: string
): LyricsVersion => ({
  id,
  lyrics,
  createdAt,
  isEdited,
  editedLyrics,
})

describe('version-utils', () => {
  describe('sortVersionsChronologically', () => {
    it('should sort versions in ascending order by createdAt', () => {
      const versions: LyricsVersion[] = [
        createTestVersion('v3', 'Third', new Date('2024-01-03')),
        createTestVersion('v1', 'First', new Date('2024-01-01')),
        createTestVersion('v2', 'Second', new Date('2024-01-02')),
      ]

      const sorted = sortVersionsChronologically(versions)

      expect(sorted[0].id).toBe('v1')
      expect(sorted[1].id).toBe('v2')
      expect(sorted[2].id).toBe('v3')
    })

    it('should handle empty array', () => {
      const result = sortVersionsChronologically([])
      expect(result).toEqual([])
    })

    it('should handle single version', () => {
      const versions = [createTestVersion('v1', 'Only', new Date('2024-01-01'))]
      const sorted = sortVersionsChronologically(versions)
      expect(sorted).toHaveLength(1)
      expect(sorted[0].id).toBe('v1')
    })

    it('should not mutate original array', () => {
      const versions: LyricsVersion[] = [
        createTestVersion('v3', 'Third', new Date('2024-01-03')),
        createTestVersion('v1', 'First', new Date('2024-01-01')),
      ]
      const originalFirstId = versions[0].id

      sortVersionsChronologically(versions)

      expect(versions[0].id).toBe(originalFirstId)
    })

    it('should handle versions with same timestamp', () => {
      const sameTime = new Date('2024-01-01T12:00:00')
      const versions: LyricsVersion[] = [
        createTestVersion('v1', 'First', sameTime),
        createTestVersion('v2', 'Second', sameTime),
      ]

      const sorted = sortVersionsChronologically(versions)
      expect(sorted).toHaveLength(2)
    })

    it('should handle string dates', () => {
      const versions: LyricsVersion[] = [
        { ...createTestVersion('v2', 'Second', new Date()), createdAt: '2024-01-02T00:00:00Z' as unknown as Date },
        { ...createTestVersion('v1', 'First', new Date()), createdAt: '2024-01-01T00:00:00Z' as unknown as Date },
      ]

      const sorted = sortVersionsChronologically(versions)
      expect(sorted[0].id).toBe('v1')
      expect(sorted[1].id).toBe('v2')
    })
  })

  describe('getVersionNumber', () => {
    const versions: LyricsVersion[] = [
      createTestVersion('v3', 'Third', new Date('2024-01-03')),
      createTestVersion('v1', 'First', new Date('2024-01-01')),
      createTestVersion('v2', 'Second', new Date('2024-01-02')),
    ]

    it('should return 1 for the oldest version', () => {
      expect(getVersionNumber(versions, 'v1')).toBe(1)
    })

    it('should return 2 for the second oldest version', () => {
      expect(getVersionNumber(versions, 'v2')).toBe(2)
    })

    it('should return 3 for the newest version', () => {
      expect(getVersionNumber(versions, 'v3')).toBe(3)
    })

    it('should return -1 for non-existent version', () => {
      expect(getVersionNumber(versions, 'non-existent')).toBe(-1)
    })

    it('should handle empty array', () => {
      expect(getVersionNumber([], 'any-id')).toBe(-1)
    })
  })

  describe('getVersionLabel', () => {
    const versions: LyricsVersion[] = [
      createTestVersion('v2', 'Second', new Date('2024-01-02')),
      createTestVersion('v1', 'First', new Date('2024-01-01')),
    ]

    it('should return "Version 1" for oldest version', () => {
      expect(getVersionLabel(versions, 'v1')).toBe('Version 1')
    })

    it('should return "Version 2" for newer version', () => {
      expect(getVersionLabel(versions, 'v2')).toBe('Version 2')
    })

    it('should return "Unknown Version" for non-existent ID', () => {
      expect(getVersionLabel(versions, 'non-existent')).toBe('Unknown Version')
    })
  })

  describe('formatRelativeTime', () => {
    const now = new Date('2024-06-15T12:00:00Z')

    it('should return "just now" for timestamps less than 5 seconds ago', () => {
      const timestamp = new Date(now.getTime() - 3000) // 3 seconds ago
      expect(formatRelativeTime(timestamp, now)).toBe('just now')
    })

    it('should return "just now" for future timestamps', () => {
      const timestamp = new Date(now.getTime() + 10000) // 10 seconds in future
      expect(formatRelativeTime(timestamp, now)).toBe('just now')
    })

    it('should format seconds correctly (singular)', () => {
      const timestamp = new Date(now.getTime() - 5000) // 5 seconds ago (minimum)
      expect(formatRelativeTime(timestamp, now)).toBe('5 seconds ago')
    })

    it('should format seconds correctly (plural)', () => {
      const timestamp = new Date(now.getTime() - 30000) // 30 seconds ago
      expect(formatRelativeTime(timestamp, now)).toBe('30 seconds ago')
    })

    it('should format 1 minute correctly (singular)', () => {
      const timestamp = new Date(now.getTime() - 60000) // 1 minute ago
      expect(formatRelativeTime(timestamp, now)).toBe('1 minute ago')
    })

    it('should format minutes correctly (plural)', () => {
      const timestamp = new Date(now.getTime() - 5 * 60000) // 5 minutes ago
      expect(formatRelativeTime(timestamp, now)).toBe('5 minutes ago')
    })

    it('should format 1 hour correctly (singular)', () => {
      const timestamp = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago
      expect(formatRelativeTime(timestamp, now)).toBe('1 hour ago')
    })

    it('should format hours correctly (plural)', () => {
      const timestamp = new Date(now.getTime() - 5 * 60 * 60 * 1000) // 5 hours ago
      expect(formatRelativeTime(timestamp, now)).toBe('5 hours ago')
    })

    it('should format 1 day correctly (singular)', () => {
      const timestamp = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 1 day ago
      expect(formatRelativeTime(timestamp, now)).toBe('1 day ago')
    })

    it('should format days correctly (plural)', () => {
      const timestamp = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      expect(formatRelativeTime(timestamp, now)).toBe('3 days ago')
    })

    it('should format 1 week correctly (singular)', () => {
      const timestamp = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
      expect(formatRelativeTime(timestamp, now)).toBe('1 week ago')
    })

    it('should format weeks correctly (plural)', () => {
      const timestamp = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) // 2 weeks ago
      expect(formatRelativeTime(timestamp, now)).toBe('2 weeks ago')
    })

    it('should format 1 month correctly (singular)', () => {
      const timestamp = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // ~1 month ago
      expect(formatRelativeTime(timestamp, now)).toBe('1 month ago')
    })

    it('should format months correctly (plural)', () => {
      const timestamp = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // ~3 months ago
      expect(formatRelativeTime(timestamp, now)).toBe('3 months ago')
    })

    it('should format 1 year correctly (singular)', () => {
      const timestamp = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) // ~1 year ago
      expect(formatRelativeTime(timestamp, now)).toBe('1 year ago')
    })

    it('should format years correctly (plural)', () => {
      const timestamp = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000) // ~2 years ago
      expect(formatRelativeTime(timestamp, now)).toBe('2 years ago')
    })

    it('should handle string date input', () => {
      const timestamp = '2024-06-15T11:59:00Z' // 1 minute ago
      expect(formatRelativeTime(timestamp, now)).toBe('1 minute ago')
    })

    it('should default to current time when now is not provided', () => {
      const veryOldTimestamp = new Date('2020-01-01')
      const result = formatRelativeTime(veryOldTimestamp)
      expect(result).toMatch(/years? ago/)
    })
  })

  describe('formatAbsoluteTime', () => {
    it('should format date in locale string format', () => {
      const date = new Date('2024-06-15T15:30:00')
      const result = formatAbsoluteTime(date)

      // Format should include month, day, year, and time
      expect(result).toContain('Jun')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })

    it('should handle string date input', () => {
      const result = formatAbsoluteTime('2024-12-25T09:00:00')
      expect(result).toContain('Dec')
      expect(result).toContain('25')
      expect(result).toContain('2024')
    })
  })

  describe('getVersionDisplayMetadata', () => {
    const now = new Date('2024-06-15T12:00:00Z')
    const versions: LyricsVersion[] = [
      createTestVersion('v2', 'Second', new Date('2024-06-15T11:55:00Z'), true, 'Edited second'),
      createTestVersion('v1', 'First', new Date('2024-06-15T10:00:00Z')),
    ]

    it('should return complete metadata for a version', () => {
      const metadata = getVersionDisplayMetadata(versions, 'v1', now)

      expect(metadata).not.toBeNull()
      expect(metadata!.versionNumber).toBe(1)
      expect(metadata!.label).toBe('Version 1')
      expect(metadata!.relativeTime).toBe('2 hours ago')
      expect(metadata!.isEdited).toBe(false)
    })

    it('should correctly report edited status', () => {
      const metadata = getVersionDisplayMetadata(versions, 'v2', now)

      expect(metadata).not.toBeNull()
      expect(metadata!.versionNumber).toBe(2)
      expect(metadata!.isEdited).toBe(true)
    })

    it('should return null for non-existent version', () => {
      const metadata = getVersionDisplayMetadata(versions, 'non-existent', now)
      expect(metadata).toBeNull()
    })

    it('should include absolute time for tooltip', () => {
      const metadata = getVersionDisplayMetadata(versions, 'v1', now)
      expect(metadata!.absoluteTime).toBeTruthy()
      expect(metadata!.absoluteTime).toContain('2024')
    })
  })

  describe('getVersionsWithMetadata', () => {
    const now = new Date('2024-06-15T12:00:00Z')

    it('should return versions sorted chronologically with metadata', () => {
      const versions: LyricsVersion[] = [
        createTestVersion('v3', 'Third', new Date('2024-06-15T11:30:00Z')),
        createTestVersion('v1', 'First', new Date('2024-06-15T09:00:00Z')),
        createTestVersion('v2', 'Second', new Date('2024-06-15T10:00:00Z')),
      ]

      const result = getVersionsWithMetadata(versions, now)

      // Should be sorted chronologically
      expect(result[0].id).toBe('v1')
      expect(result[1].id).toBe('v2')
      expect(result[2].id).toBe('v3')

      // Should have correct version numbers
      expect(result[0].displayMetadata.versionNumber).toBe(1)
      expect(result[1].displayMetadata.versionNumber).toBe(2)
      expect(result[2].displayMetadata.versionNumber).toBe(3)
    })

    it('should include relative time in metadata', () => {
      const versions = [createTestVersion('v1', 'First', new Date('2024-06-15T11:30:00Z'))]

      const result = getVersionsWithMetadata(versions, now)

      expect(result[0].displayMetadata.relativeTime).toBe('30 minutes ago')
    })

    it('should handle empty array', () => {
      const result = getVersionsWithMetadata([], now)
      expect(result).toEqual([])
    })

    it('should preserve original version properties', () => {
      const versions = [createTestVersion('v1', 'Test lyrics', new Date('2024-06-15T11:00:00Z'), true, 'Edited')]

      const result = getVersionsWithMetadata(versions, now)

      expect(result[0].id).toBe('v1')
      expect(result[0].lyrics).toBe('Test lyrics')
      expect(result[0].isEdited).toBe(true)
      expect(result[0].editedLyrics).toBe('Edited')
    })
  })
})
