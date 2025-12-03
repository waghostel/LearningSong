/**
 * Sync mode toggle component for switching between word-level and line-level lyrics synchronization
 * 
 * Allows users to toggle between:
 * - 'word': Word-by-word highlighting (default)
 * - 'line': Line-by-line highlighting with clickable navigation
 * 
 * Persists the user's preference to localStorage for restoration on page reload.
 * 
 * **Feature: song-playback-improvements**
 * **Validates: Requirements 9.5**
 */

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Type } from 'lucide-react'

export type SyncMode = 'word' | 'line'

interface SyncModeToggleProps {
  mode: SyncMode
  onChange: (mode: SyncMode) => void
  disabled?: boolean
}

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

/**
 * SyncModeToggle component
 * 
 * Renders a toggle control to switch between word-level and line-level sync modes.
 * The preference is persisted to localStorage and restored on page reload.
 * 
 * **Feature: song-playback-improvements, Property 25: Sync mode toggle persistence**
 * **Validates: Requirements 9.5**
 */
export function SyncModeToggle({
  mode,
  onChange,
  disabled = false,
}: SyncModeToggleProps) {
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize from localStorage on mount
  useEffect(() => {
    setIsInitialized(true)
  }, [])

  const handleToggle = () => {
    const newMode: SyncMode = mode === 'word' ? 'line' : 'word'
    onChange(newMode)
    saveSyncMode(newMode)
  }

  if (!isInitialized) {
    return null
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
      <Type className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      
      <span className="text-sm font-medium text-foreground">Sync Mode:</span>
      
      <div className="flex gap-1 ml-auto">
        <Button
          variant={mode === 'word' ? 'default' : 'outline'}
          size="sm"
          onClick={handleToggle}
          disabled={disabled}
          className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-pressed={mode === 'word'}
          aria-label="Switch to word-level synchronization"
        >
          Word
        </Button>
        
        <Button
          variant={mode === 'line' ? 'default' : 'outline'}
          size="sm"
          onClick={handleToggle}
          disabled={disabled}
          className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-pressed={mode === 'line'}
          aria-label="Switch to line-level synchronization"
        >
          Line
        </Button>
      </div>
      
      <span className="text-xs text-muted-foreground ml-2">
        {mode === 'word' ? 'Word-by-word' : 'Line-by-line'}
      </span>
    </div>
  )
}
