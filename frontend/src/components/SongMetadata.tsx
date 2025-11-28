import * as React from 'react'
import { Music, Calendar, Clock, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MusicStyle } from '@/api/songs'

export interface SongMetadataProps {
  style: MusicStyle
  createdAt: Date
  expiresAt: Date
}

// Style display names and colors
const styleConfig: Record<MusicStyle, { label: string; color: string }> = {
  [MusicStyle.POP]: { label: 'Pop', color: 'bg-pink-100 text-pink-800' },
  [MusicStyle.RAP]: { label: 'Rap', color: 'bg-purple-100 text-purple-800' },
  [MusicStyle.FOLK]: { label: 'Folk', color: 'bg-amber-100 text-amber-800' },
  [MusicStyle.ELECTRONIC]: { label: 'Electronic', color: 'bg-cyan-100 text-cyan-800' },
  [MusicStyle.ROCK]: { label: 'Rock', color: 'bg-red-100 text-red-800' },
  [MusicStyle.JAZZ]: { label: 'Jazz', color: 'bg-indigo-100 text-indigo-800' },
  [MusicStyle.CHILDREN]: { label: "Children's", color: 'bg-green-100 text-green-800' },
  [MusicStyle.CLASSICAL]: { label: 'Classical', color: 'bg-slate-100 text-slate-800' },
}

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

export function SongMetadata({ style, createdAt, expiresAt }: SongMetadataProps) {
  const [timeRemaining, setTimeRemaining] = React.useState(() => 
    getTimeRemaining(expiresAt)
  )

  // Update countdown every minute
  React.useEffect(() => {
    const updateTime = () => setTimeRemaining(getTimeRemaining(expiresAt))
    updateTime()
    
    const interval = setInterval(updateTime, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [expiresAt])

  const styleInfo = styleConfig[style] || { label: style, color: 'bg-gray-100 text-gray-800' }

  return (
    <div 
      className="flex flex-col gap-3 p-4 rounded-lg border bg-card"
      role="region"
      aria-label="Song metadata"
    >
      {/* Style badge */}
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">Style:</span>
        <span 
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            styleInfo.color
          )}
          data-testid="style-badge"
        >
          {styleInfo.label}
        </span>
      </div>

      {/* Generation date */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">Created:</span>
        <span className="text-sm" data-testid="created-date">
          {formatDate(createdAt)}
        </span>
      </div>

      {/* Expiration time with countdown */}
      <div className="flex items-center gap-2">
        {timeRemaining.isExpired ? (
          <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
        ) : timeRemaining.isWarning ? (
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
        <span className="text-sm text-muted-foreground">Expires:</span>
        <span 
          className={cn(
            'text-sm',
            timeRemaining.isExpired && 'text-destructive font-medium',
            timeRemaining.isWarning && !timeRemaining.isExpired && 'text-warning font-medium'
          )}
          data-testid="expiration-time"
        >
          {timeRemaining.formatted}
        </span>
      </div>

      {/* Warning notice */}
      {timeRemaining.isWarning && !timeRemaining.isExpired && (
        <div 
          className="flex items-center gap-2 p-2 rounded bg-warning/10 text-warning text-sm"
          role="alert"
          data-testid="expiration-warning"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>This song will expire soon. Download it to keep a copy.</span>
        </div>
      )}

      {/* Expired notice */}
      {timeRemaining.isExpired && (
        <div 
          className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-sm"
          role="alert"
          data-testid="expired-notice"
        >
          <XCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>This song has expired and is no longer available for playback.</span>
        </div>
      )}
    </div>
  )
}
