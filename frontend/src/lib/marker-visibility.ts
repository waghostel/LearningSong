/**
 * Utilities for managing section marker visibility preference
 */

const STORAGE_KEY = 'lyrics-marker-visibility'

/**
 * Load marker visibility preference from localStorage
 */
export function loadMarkerVisibility(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      return stored === 'true'
    }
  } catch (error) {
    console.warn('Failed to load marker visibility preference:', error)
  }
  // Default to showing markers
  return true
}

/**
 * Save marker visibility preference to localStorage
 */
export function saveMarkerVisibility(showMarkers: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(showMarkers))
  } catch (error) {
    console.warn('Failed to save marker visibility preference:', error)
  }
}
