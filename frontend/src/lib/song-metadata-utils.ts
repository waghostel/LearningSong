/**
 * Utility functions for SongMetadata component
 * Extracted to avoid react-refresh warnings
 */

/**
 * Format a date to a user-friendly string
 * @param date - Date to format
 * @returns Formatted date string (e.g., "Nov 28, 2025 at 3:45 PM")
 */
export function formatDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return 'Unknown date'
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Calculate time remaining until expiration
 * @param expiresAt - Expiration date
 * @param now - Current date (for testing)
 * @returns Object with hours, minutes, and formatted string
 */
export function getTimeRemaining(expiresAt: Date, now: Date = new Date()): {
  totalMs: number
  hours: number
  minutes: number
  formatted: string
  isExpired: boolean
  isWarning: boolean
} {
  if (!(expiresAt instanceof Date) || isNaN(expiresAt.getTime())) {
    return {
      totalMs: 0,
      hours: 0,
      minutes: 0,
      formatted: 'Unknown',
      isExpired: true,
      isWarning: false,
    }
  }

  const totalMs = expiresAt.getTime() - now.getTime()
  const isExpired = totalMs <= 0
  
  if (isExpired) {
    return {
      totalMs: 0,
      hours: 0,
      minutes: 0,
      formatted: 'Expired',
      isExpired: true,
      isWarning: false,
    }
  }

  const totalMinutes = Math.floor(totalMs / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  // Warning threshold: 6 hours = 360 minutes
  const isWarning = totalMinutes < 360

  let formatted: string
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    formatted = remainingHours > 0 
      ? `${days}d ${remainingHours}h remaining`
      : `${days}d remaining`
  } else if (hours > 0) {
    formatted = minutes > 0 
      ? `${hours}h ${minutes}m remaining`
      : `${hours}h remaining`
  } else {
    formatted = `${minutes}m remaining`
  }

  return {
    totalMs,
    hours,
    minutes,
    formatted,
    isExpired,
    isWarning,
  }
}
