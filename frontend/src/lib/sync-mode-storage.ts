/**
 * Utilities for managing sync mode preference
 */

export type SyncMode = 'word' | 'line'

const SYNC_MODE_STORAGE_KEY = 'lyrics-sync-mode'

/**
 * Loads the sync mode preference from localStorage
 * Defaults to 'word' if not found or invalid
 */
export function loadSyncMode(): SyncMode {
  try {
    const stored = localStorage.getItem(SYNC_MODE_STORAGE_KEY)
    if (stored === 'word' || stored === 'line') {
      return stored
    }
  } catch {
    // localStorage unavailable, use default
  }
  return 'word'
}

/**
 * Saves the sync mode preference to localStorage
 */
export function saveSyncMode(mode: SyncMode): void {
  try {
    localStorage.setItem(SYNC_MODE_STORAGE_KEY, mode)
  } catch {
    // localStorage unavailable, silently fail
  }
}
