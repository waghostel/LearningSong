/**
 * Performance utilities for VTT generation and lyrics synchronization
 * 
 * This module provides:
 * - Debouncing utilities for real-time highlighting updates
 * - Performance monitoring wrappers
 * - Memoization helpers for expensive computations
 * 
 * **Feature: vtt-download-enhancement**
 * **Task 9: Performance optimization and final integration**
 */

/**
 * Simple debounce function that delays invocation until after wait milliseconds
 * have elapsed since the last time it was invoked.
 * 
 * @param func - Function to debounce
 * @param wait - Milliseconds to wait
 * @returns Debounced function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
    }, wait)
  }
}

/**
 * Throttle function that limits how often a function can be called.
 * Unlike debounce, throttle ensures the function is called at most once
 * every `limit` milliseconds.
 * 
 * @param func - Function to throttle
 * @param limit - Minimum milliseconds between calls
 * @returns Throttled function
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    if (timeSinceLastCall >= limit) {
      lastCall = now
      func(...args)
    } else if (!timeoutId) {
      // Schedule a trailing call
      timeoutId = setTimeout(() => {
        lastCall = Date.now()
        timeoutId = null
        func(...args)
      }, limit - timeSinceLastCall)
    }
  }
}

/**
 * Performance measurement result
 */
export interface PerformanceResult<T> {
  result: T
  durationMs: number
}

/**
 * Measures the execution time of a synchronous function
 * 
 * @param func - Function to measure
 * @returns Object with result and duration in milliseconds
 */
export function measurePerformance<T>(func: () => T): PerformanceResult<T> {
  const start = performance.now()
  const result = func()
  const end = performance.now()
  return {
    result,
    durationMs: end - start,
  }
}

/**
 * Measures the execution time of an async function
 * 
 * @param func - Async function to measure
 * @returns Promise resolving to object with result and duration in milliseconds
 */
export async function measurePerformanceAsync<T>(
  func: () => Promise<T>
): Promise<PerformanceResult<T>> {
  const start = performance.now()
  const result = await func()
  const end = performance.now()
  return {
    result,
    durationMs: end - start,
  }
}

/**
 * Simple LRU (Least Recently Used) cache implementation
 * Used for memoizing expensive VTT generation operations
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>
  private maxSize: number

  constructor(maxSize: number = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined
    }
    // Move to end (most recently used)
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

/**
 * Creates a memoized version of a function using LRU cache
 * 
 * @param func - Function to memoize
 * @param keyGenerator - Function to generate cache key from arguments
 * @param maxSize - Maximum cache size
 * @returns Memoized function
 */
export function memoize<Args extends unknown[], R>(
  func: (...args: Args) => R,
  keyGenerator: (...args: Args) => string,
  maxSize: number = 100
): (...args: Args) => R {
  const cache = new LRUCache<string, R>(maxSize)

  return (...args: Args): R => {
    const key = keyGenerator(...args)
    const cached = cache.get(key)
    if (cached !== undefined) {
      return cached
    }
    const result = func(...args)
    cache.set(key, result)
    return result
  }
}

/**
 * Performance thresholds for VTT operations (in milliseconds)
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Maximum acceptable time for word-to-line aggregation */
  AGGREGATION_MAX_MS: 100,
  /** Maximum acceptable time for VTT content generation */
  VTT_GENERATION_MAX_MS: 50,
  /** Maximum acceptable time for line highlighting update */
  HIGHLIGHT_UPDATE_MAX_MS: 16, // ~60fps
  /** Recommended debounce time for highlighting updates */
  HIGHLIGHT_DEBOUNCE_MS: 50,
  /** Recommended throttle time for time updates from audio player */
  TIME_UPDATE_THROTTLE_MS: 100,
} as const

/**
 * Logger for performance warnings
 * Only logs when explicitly enabled or durationMs significantly exceeds threshold
 */
export function logPerformanceWarning(
  operation: string,
  durationMs: number,
  threshold: number
): void {
  // Performance warnings are disabled in production builds
  // For now, just log significant performance issues (2x threshold)
  // to avoid noise while still catching major regressions
  if (durationMs > threshold * 2) {
    console.warn(
      `[Performance] ${operation} took ${durationMs.toFixed(2)}ms (threshold: ${threshold}ms)`
    )
  }
}

/**
 * Creates a performance-monitored version of a function
 * Logs warnings when execution exceeds threshold
 * 
 * @param func - Function to monitor
 * @param operationName - Name for logging
 * @param threshold - Warning threshold in milliseconds
 * @returns Monitored function
 */
export function withPerformanceMonitoring<Args extends unknown[], R>(
  func: (...args: Args) => R,
  operationName: string,
  threshold: number
): (...args: Args) => R {
  return (...args: Args): R => {
    const { result, durationMs } = measurePerformance(() => func(...args))
    logPerformanceWarning(operationName, durationMs, threshold)
    return result
  }
}

/**
 * Binary search to find the current line index based on time
 * More efficient than linear search for large line cue arrays
 * 
 * @param lineCues - Array of line cues sorted by startTime
 * @param currentTime - Current playback time in seconds
 * @returns Index of the active line, or -1 if none
 */
export function binarySearchCurrentLine(
  lineCues: Array<{ startTime: number; endTime: number }>,
  currentTime: number
): number {
  if (lineCues.length === 0) return -1

  let left = 0
  let right = lineCues.length - 1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const cue = lineCues[mid]

    if (currentTime >= cue.startTime && currentTime < cue.endTime) {
      return mid
    } else if (currentTime < cue.startTime) {
      right = mid - 1
    } else {
      // currentTime >= cue.endTime - move to next cue
      left = mid + 1
    }
  }

  // If we didn't find an active cue, no line should be highlighted
  return -1
}
