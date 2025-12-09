/**
 * Version ordering and display utilities
 * 
 * Feature: lyrics-regeneration-versioning
 * Task 13: Add version ordering and display
 * Requirements: 3.1, 3.2, 3.3, 8.1
 */

import type { LyricsVersion } from '@/stores/lyricsEditingStore'

/**
 * Sorts versions chronologically by createdAt timestamp (oldest first)
 * Requirements: 8.1 - Chronological version ordering
 * 
 * @param versions - Array of LyricsVersion objects to sort
 * @returns New sorted array (does not mutate original)
 */
export function sortVersionsChronologically(versions: LyricsVersion[]): LyricsVersion[] {
  return [...versions].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime()
    const timeB = new Date(b.createdAt).getTime()
    return timeA - timeB
  })
}

/**
 * Gets the sequential version number for a version based on chronological order
 * Requirements: 3.2 - Sequential version numbering
 * 
 * @param versions - Array of all versions
 * @param versionId - ID of the version to get the number for
 * @returns 1-based version number, or -1 if not found
 */
export function getVersionNumber(versions: LyricsVersion[], versionId: string): number {
  const sortedVersions = sortVersionsChronologically(versions)
  const index = sortedVersions.findIndex(v => v.id === versionId)
  return index === -1 ? -1 : index + 1
}

/**
 * Gets the display label for a version (e.g., "Version 1", "Version 2")
 * Requirements: 3.1 - Version display includes metadata
 * 
 * @param versions - Array of all versions
 * @param versionId - ID of the version to get the label for
 * @returns Display label string
 */
export function getVersionLabel(versions: LyricsVersion[], versionId: string): string {
  const versionNumber = getVersionNumber(versions, versionId)
  return versionNumber === -1 ? 'Unknown Version' : `Version ${versionNumber}`
}

/**
 * Time interval constants in milliseconds
 */
const TIME_INTERVALS = {
  year: 365 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000,
} as const

/**
 * Formats a timestamp in human-readable relative format (e.g., "2 minutes ago")
 * Requirements: 3.3 - Timestamps in human-readable format
 * 
 * @param date - Date object or date string to format
 * @param now - Optional current time for testing (defaults to new Date())
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(date: Date | string, now: Date = new Date()): string {
  const timestamp = new Date(date).getTime()
  const currentTime = now.getTime()
  const elapsed = currentTime - timestamp

  // Handle future dates
  if (elapsed < 0) {
    return 'just now'
  }

  // Just now (less than 5 seconds)
  if (elapsed < 5000) {
    return 'just now'
  }

  // Seconds
  if (elapsed < TIME_INTERVALS.minute) {
    const seconds = Math.floor(elapsed / TIME_INTERVALS.second)
    return `${seconds} second${seconds === 1 ? '' : 's'} ago`
  }

  // Minutes
  if (elapsed < TIME_INTERVALS.hour) {
    const minutes = Math.floor(elapsed / TIME_INTERVALS.minute)
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }

  // Hours
  if (elapsed < TIME_INTERVALS.day) {
    const hours = Math.floor(elapsed / TIME_INTERVALS.hour)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  // Days
  if (elapsed < TIME_INTERVALS.week) {
    const days = Math.floor(elapsed / TIME_INTERVALS.day)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  // Weeks
  if (elapsed < TIME_INTERVALS.month) {
    const weeks = Math.floor(elapsed / TIME_INTERVALS.week)
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  }

  // Months
  if (elapsed < TIME_INTERVALS.year) {
    const months = Math.floor(elapsed / TIME_INTERVALS.month)
    return `${months} month${months === 1 ? '' : 's'} ago`
  }

  // Years
  const years = Math.floor(elapsed / TIME_INTERVALS.year)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

/**
 * Formats an absolute timestamp for tooltip display
 * Requirements: 3.3 - Show timestamp tooltip on hover
 * 
 * @param date - Date object or date string to format
 * @returns Formatted absolute timestamp string (e.g., "Dec 9, 2025 3:45 PM")
 */
export function formatAbsoluteTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Gets all version metadata for display purposes
 * Combines multiple utilities for convenient UI rendering
 * 
 * @param versions - Array of all versions
 * @param versionId - ID of the version to get metadata for
 * @param now - Optional current time for testing
 * @returns Version display metadata
 */
export interface VersionDisplayMetadata {
  versionNumber: number
  label: string
  relativeTime: string
  absoluteTime: string
  isEdited: boolean
}

export function getVersionDisplayMetadata(
  versions: LyricsVersion[],
  versionId: string,
  now: Date = new Date()
): VersionDisplayMetadata | null {
  const version = versions.find(v => v.id === versionId)
  if (!version) return null

  return {
    versionNumber: getVersionNumber(versions, versionId),
    label: getVersionLabel(versions, versionId),
    relativeTime: formatRelativeTime(version.createdAt, now),
    absoluteTime: formatAbsoluteTime(version.createdAt),
    isEdited: version.isEdited,
  }
}

/**
 * Gets all versions with their display metadata, sorted chronologically
 * Requirements: 8.1 - Chronological version ordering
 * 
 * @param versions - Array of all versions
 * @param now - Optional current time for testing
 * @returns Sorted array of versions with display metadata
 */
export interface VersionWithMetadata extends LyricsVersion {
  displayMetadata: VersionDisplayMetadata
}

export function getVersionsWithMetadata(
  versions: LyricsVersion[],
  now: Date = new Date()
): VersionWithMetadata[] {
  const sortedVersions = sortVersionsChronologically(versions)
  return sortedVersions.map((version, index) => ({
    ...version,
    displayMetadata: {
      versionNumber: index + 1,
      label: `Version ${index + 1}`,
      relativeTime: formatRelativeTime(version.createdAt, now),
      absoluteTime: formatAbsoluteTime(version.createdAt),
      isEdited: version.isEdited,
    },
  }))
}
