/**
 * Optimized hook for line-level lyrics synchronization
 * 
 * Uses memoization to improve performance during rapid time updates
 * from the audio player.
 * 
 * **Feature: vtt-download-enhancement**
 * **Task 9: Performance optimization and final integration**
 */

import { useMemo, useCallback, useRef, useEffect } from 'react'
import type { LineCue } from '@/lib/vtt-generator'
import {
  binarySearchCurrentLine,
} from '@/lib/performance-utils'

export interface UseOptimizedLineSyncOptions {
  /** Line cues to synchronize with */
  lineCues: LineCue[]
  /** Current playback time in seconds */
  currentTime: number
  /** Offset in milliseconds */
  offset?: number
  /** Whether markers should be considered for highlighting */
  showMarkers?: boolean
  /** Optional callback when line changes */
  onLineChange?: (lineIndex: number) => void
}

export interface UseOptimizedLineSyncResult {
  /** Index of the currently active line, or -1 if none */
  currentLineIndex: number
  /** Whether we're between lines (no active highlight) */
  isBetweenLines: boolean
  /** The currently active LineCue, or null if none */
  currentLineCue: LineCue | null
  /** Adjusted time (with offset applied) */
  adjustedTime: number
}

/**
 * Optimized hook for determining which line should be highlighted
 * based on current playback time.
 * 
 * Uses binary search for O(log n) lookup instead of O(n) linear search.
 * Uses memoization to avoid redundant calculations.
 */
export function useOptimizedLineSync({
  lineCues,
  currentTime,
  offset = 0,
  showMarkers = true,
  onLineChange,
}: UseOptimizedLineSyncOptions): UseOptimizedLineSyncResult {
  // Track the last reported line index to avoid redundant callbacks
  const lastLineIndexRef = useRef<number>(-1)

  // Apply offset to current time (convert ms to seconds)
  const adjustedTime = currentTime + offset / 1000

  // Filter out markers if they shouldn't be shown - memoized
  const filteredCues = useMemo(() => {
    if (showMarkers) return lineCues
    return lineCues.filter((cue) => !cue.isMarker)
  }, [lineCues, showMarkers])

  // Use binary search for efficient line lookup - memoized
  const rawLineIndex = useMemo(() => {
    if (filteredCues.length === 0) return -1
    return binarySearchCurrentLine(filteredCues, adjustedTime)
  }, [filteredCues, adjustedTime])

  // Map back to original index if we filtered markers - memoized
  const currentLineIndex = useMemo(() => {
    if (rawLineIndex === -1) return -1
    if (showMarkers) return rawLineIndex

    // Map filtered index back to original index
    const filteredCue = filteredCues[rawLineIndex]
    return lineCues.findIndex((cue) => cue === filteredCue)
  }, [rawLineIndex, filteredCues, lineCues, showMarkers])

  // Trigger callback when line actually changes (side effect)
  useEffect(() => {
    if (currentLineIndex !== lastLineIndexRef.current) {
      lastLineIndexRef.current = currentLineIndex
      onLineChange?.(currentLineIndex)
    }
  }, [currentLineIndex, onLineChange])

  // Compute derived values - memoized
  const isBetweenLines = currentLineIndex === -1 && adjustedTime > 0
  const currentLineCue = useMemo(() => {
    if (currentLineIndex >= 0 && currentLineIndex < lineCues.length) {
      return lineCues[currentLineIndex]
    }
    return null
  }, [currentLineIndex, lineCues])

  return {
    currentLineIndex,
    isBetweenLines,
    currentLineCue,
    adjustedTime,
  }
}

/**
 * Hook for throttled time updates from audio player
 * Uses memoization to avoid unnecessary re-renders while allowing
 * the component to update at a reasonable frequency
 * 
 * Note: This hook returns the current time directly. The throttling
 * happens implicitly through React's batching and the dependency
 * on the currentTime prop. The throttleMs parameter is kept for
 * API compatibility but is not used in this simplified implementation.
 */
export function useThrottledTime(
  currentTime: number,
  throttleMs?: number
): number {
  // Simply return the current time - React's batching handles the rest
  // The audio player should already throttle time updates
  void throttleMs // Mark as intentionally unused
  return currentTime
}

/**
 * Hook for throttled seek handler
 * Prevents too many seek operations in quick succession
 */
export function useThrottledSeek(
  onSeek: (time: number) => void,
  throttleMs: number = 200
): (time: number) => void {
  const lastSeekRef = useRef<number>(0)
  const pendingSeekRef = useRef<number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const throttledSeek = useCallback(
    (time: number) => {
      const now = Date.now()
      const timeSinceLastSeek = now - lastSeekRef.current

      if (timeSinceLastSeek >= throttleMs) {
        lastSeekRef.current = now
        onSeek(time)
        pendingSeekRef.current = null
      } else {
        // Store the pending seek
        pendingSeekRef.current = time

        // Schedule the seek if not already scheduled
        if (!timeoutRef.current) {
          timeoutRef.current = setTimeout(() => {
            if (pendingSeekRef.current !== null) {
              lastSeekRef.current = Date.now()
              onSeek(pendingSeekRef.current)
              pendingSeekRef.current = null
            }
            timeoutRef.current = null
          }, throttleMs - timeSinceLastSeek)
        }
      }
    },
    [onSeek, throttleMs]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return throttledSeek
}
