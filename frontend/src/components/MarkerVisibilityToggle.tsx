/**
 * Toggle component for showing/hiding section markers in lyrics
 * 
 * **Feature: song-playback-improvements**
 * **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface MarkerVisibilityToggleProps {
  showMarkers: boolean
  onChange: (showMarkers: boolean) => void
  disabled?: boolean
  className?: string
}

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

/**
 * Toggle switch for showing/hiding section markers in lyrics display
 * Persists preference to localStorage
 */
export function MarkerVisibilityToggle({
  showMarkers,
  onChange,
  disabled = false,
  className,
}: MarkerVisibilityToggleProps) {
  const handleToggle = () => {
    const newValue = !showMarkers
    onChange(newValue)
    saveMarkerVisibility(newValue)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label
        htmlFor="marker-visibility-toggle"
        className="text-sm font-medium text-foreground cursor-pointer select-none"
      >
        Show section markers
      </label>
      <button
        id="marker-visibility-toggle"
        type="button"
        role="switch"
        aria-checked={showMarkers}
        aria-label="Toggle section marker visibility"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          showMarkers ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-background transition-transform',
            showMarkers ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  )
}
