/**
 * Analytics tracking utility for song variation events
 * 
 * This module provides functions to log analytics events for:
 * - Variation selection/switching
 * - Song playback
 * - User interactions
 * 
 * Requirements: 10.1, 10.2, 10.3
 */

export interface AnalyticsEvent {
  event_type: string
  timestamp: string
  user_id?: string
  song_id?: string
  variation_index?: number
  [key: string]: unknown
}

/**
 * Log an analytics event
 * 
 * In a production environment, this would send events to an analytics service
 * (e.g., Google Analytics, Mixpanel, Amplitude, etc.)
 * 
 * For now, we log to console and could extend to send to backend
 */
function logEvent(event: AnalyticsEvent): void {
  // Log to console for development
  console.log('[Analytics]', event)
  
  // In production, send to analytics service:
  // - Google Analytics: gtag('event', event.event_type, event)
  // - Mixpanel: mixpanel.track(event.event_type, event)
  // - Custom backend: fetch('/api/analytics', { method: 'POST', body: JSON.stringify(event) })
}

/**
 * Log a variation selection event
 * 
 * Property 26: Selection event logging
 * Validates: Requirements 10.1, 10.3
 * 
 * @param songId - The song/task ID
 * @param variationIndex - The selected variation index (0 or 1)
 * @param userId - Optional user ID for context
 */
export function logVariationSelection(
  songId: string,
  variationIndex: number,
  userId?: string
): void {
  logEvent({
    event_type: 'variation_selected',
    timestamp: new Date().toISOString(),
    song_id: songId,
    variation_index: variationIndex,
    user_id: userId,
  })
}

/**
 * Log a song playback start event
 * 
 * Property 27: Play event tracking
 * Validates: Requirements 10.2
 * 
 * @param songId - The song/task ID
 * @param variationIndex - The variation being played (0 or 1)
 * @param userId - Optional user ID for context
 */
export function logPlaybackStart(
  songId: string,
  variationIndex: number,
  userId?: string
): void {
  logEvent({
    event_type: 'playback_started',
    timestamp: new Date().toISOString(),
    song_id: songId,
    variation_index: variationIndex,
    user_id: userId,
  })
}

/**
 * Log a song playback pause event
 * 
 * @param songId - The song/task ID
 * @param variationIndex - The variation being paused (0 or 1)
 * @param currentTime - Current playback position in seconds
 * @param userId - Optional user ID for context
 */
export function logPlaybackPause(
  songId: string,
  variationIndex: number,
  currentTime: number,
  userId?: string
): void {
  logEvent({
    event_type: 'playback_paused',
    timestamp: new Date().toISOString(),
    song_id: songId,
    variation_index: variationIndex,
    current_time: currentTime,
    user_id: userId,
  })
}

/**
 * Log a song playback end event
 * 
 * @param songId - The song/task ID
 * @param variationIndex - The variation that finished (0 or 1)
 * @param userId - Optional user ID for context
 */
export function logPlaybackEnd(
  songId: string,
  variationIndex: number,
  userId?: string
): void {
  logEvent({
    event_type: 'playback_ended',
    timestamp: new Date().toISOString(),
    song_id: songId,
    variation_index: variationIndex,
    user_id: userId,
  })
}

/**
 * Log a share link creation event
 * 
 * Property 28: Share link uses primary variation
 * Validates: Requirements 10.4
 * 
 * @param songId - The song/task ID
 * @param primaryVariationIndex - The primary variation index being shared
 * @param userId - Optional user ID for context
 */
export function logShareLinkCreated(
  songId: string,
  primaryVariationIndex: number,
  userId?: string
): void {
  logEvent({
    event_type: 'share_link_created',
    timestamp: new Date().toISOString(),
    song_id: songId,
    primary_variation_index: primaryVariationIndex,
    user_id: userId,
  })
}
