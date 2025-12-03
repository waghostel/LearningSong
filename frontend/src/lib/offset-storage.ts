/**
 * Offset storage utilities for persisting lyrics timing adjustments
 * 
 * Stores offset values per song in localStorage with LRU eviction
 * to prevent storage bloat.
 * 
 * **Feature: song-playback-improvements**
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.4**
 */

/**
 * Storage key for offset data in localStorage
 */
export const OFFSET_STORAGE_KEY = 'lyrics-offset-storage'

/**
 * Maximum number of entries before LRU eviction
 */
export const MAX_OFFSET_ENTRIES = 50

/**
 * Default offset value when none is stored
 */
export const DEFAULT_OFFSET = 0

/**
 * Single offset entry with timestamp for LRU tracking
 */
export interface OffsetEntry {
  offset: number      // Offset in milliseconds
  updatedAt: number   // Timestamp for LRU eviction
}

/**
 * Storage structure mapping song IDs to offset entries
 */
export interface OffsetStorage {
  [songId: string]: OffsetEntry
}

/**
 * Save an offset value for a specific song
 * 
 * @param songId - The unique identifier of the song
 * @param offset - The offset value in milliseconds
 * 
 * **Feature: song-playback-improvements, Property 7: Offset persistence round-trip**
 * **Validates: Requirements 2.3, 12.1**
 */
export function saveOffset(songId: string, offset: number): void {
  if (!songId) {
    return
  }

  try {
    const storage = loadStorage()
    
    // Add or update the entry
    storage[songId] = {
      offset,
      updatedAt: Date.now(),
    }
    
    // Apply LRU eviction if needed
    const evictedStorage = applyLruEviction(storage)
    
    // Save back to localStorage
    localStorage.setItem(OFFSET_STORAGE_KEY, JSON.stringify(evictedStorage))
  } catch {
    // Handle localStorage errors gracefully (quota exceeded, disabled, etc.)
    // Continue without persisting - user can still use the offset in current session
    console.warn('Failed to save offset to localStorage')
  }
}


/**
 * Load the offset value for a specific song
 * 
 * @param songId - The unique identifier of the song
 * @returns The stored offset value, or DEFAULT_OFFSET (0) if not found or invalid
 * 
 * **Feature: song-playback-improvements, Property 7: Offset persistence round-trip**
 * **Validates: Requirements 2.4, 12.2, 12.4**
 */
export function loadOffset(songId: string): number {
  if (!songId) {
    return DEFAULT_OFFSET
  }

  try {
    const storage = loadStorage()
    const entry = storage[songId]
    
    if (!entry || typeof entry.offset !== 'number') {
      return DEFAULT_OFFSET
    }
    
    // Update the access time for LRU tracking
    entry.updatedAt = Date.now()
    
    try {
      localStorage.setItem(OFFSET_STORAGE_KEY, JSON.stringify(storage))
    } catch {
      // Ignore save errors during load - the offset is still valid
    }
    
    return entry.offset
  } catch {
    // Handle localStorage errors gracefully
    // Return default offset so the app continues to work
    return DEFAULT_OFFSET
  }
}

/**
 * Load the entire offset storage from localStorage
 * 
 * @returns The parsed storage object, or empty object if not found/invalid
 */
export function loadStorage(): OffsetStorage {
  try {
    const raw = localStorage.getItem(OFFSET_STORAGE_KEY)
    
    if (!raw) {
      return {}
    }
    
    const parsed = JSON.parse(raw)
    
    // Validate that parsed data is an object
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {}
    }
    
    return parsed as OffsetStorage
  } catch {
    // Handle JSON parse errors or localStorage access errors
    return {}
  }
}

/**
 * Apply LRU eviction to keep storage within MAX_OFFSET_ENTRIES limit
 * 
 * @param storage - The current storage object
 * @returns Storage object with oldest entries removed if over limit
 * 
 * **Feature: song-playback-improvements, Property 8: Offset storage LRU eviction**
 * **Validates: Requirements 12.3**
 */
export function applyLruEviction(storage: OffsetStorage): OffsetStorage {
  const entries = Object.entries(storage)
  
  if (entries.length <= MAX_OFFSET_ENTRIES) {
    return storage
  }
  
  // Sort by updatedAt ascending (oldest first)
  entries.sort((a, b) => {
    const timeA = a[1].updatedAt || 0
    const timeB = b[1].updatedAt || 0
    return timeA - timeB
  })
  
  // Keep only the most recent MAX_OFFSET_ENTRIES
  const entriesToKeep = entries.slice(entries.length - MAX_OFFSET_ENTRIES)
  
  // Rebuild the storage object
  const result: OffsetStorage = {}
  for (const [songId, entry] of entriesToKeep) {
    result[songId] = entry
  }
  
  return result
}

/**
 * Clear all stored offsets
 * Useful for testing or user-initiated reset
 */
export function clearOffsetStorage(): void {
  try {
    localStorage.removeItem(OFFSET_STORAGE_KEY)
  } catch {
    // Ignore errors when clearing
  }
}

/**
 * Get the number of stored offset entries
 * 
 * @returns The count of stored entries
 */
export function getOffsetEntryCount(): number {
  const storage = loadStorage()
  return Object.keys(storage).length
}
