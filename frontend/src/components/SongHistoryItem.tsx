import { useCallback } from 'react'
import { Music, Calendar, Clock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MusicStyle, type SongHistorySummary } from '@/api/songs'
import { formatDate, getTimeRemaining } from '@/lib/song-metadata-utils'

export interface SongHistoryItemProps {
  song: SongHistorySummary
  onClick: (songId: string) => void
  disabled?: boolean
}

// Style display names and colors (matching SongMetadata)
const styleConfig: Record<MusicStyle, { label: string; color: string; icon: string }> = {
  [MusicStyle.POP]: { label: 'Pop', color: 'bg-pink-100 text-pink-800', icon: '🎤' },
  [MusicStyle.RAP]: { label: 'Rap', color: 'bg-purple-100 text-purple-800', icon: '🎙️' },
  [MusicStyle.FOLK]: { label: 'Folk', color: 'bg-amber-100 text-amber-800', icon: '🎸' },
  [MusicStyle.ELECTRONIC]: { label: 'Electronic', color: 'bg-cyan-100 text-cyan-800', icon: '🎛️' },
  [MusicStyle.ROCK]: { label: 'Rock', color: 'bg-red-100 text-red-800', icon: '🎸' },
  [MusicStyle.JAZZ]: { label: 'Jazz', color: 'bg-indigo-100 text-indigo-800', icon: '🎷' },
  [MusicStyle.CHILDREN]: { label: "Children's", color: 'bg-green-100 text-green-800', icon: '🎵' },
  [MusicStyle.CLASSICAL]: { label: 'Classical', color: 'bg-slate-100 text-slate-800', icon: '🎻' },
}

/**
 * SongHistoryItem component for displaying a single song in the history list
 * Requirements: 4.2, 8.3, 8.4
 * 
 * - Display song style with icon
 * - Show creation date and expiration countdown
 * - Show lyrics preview (first 100 chars)
 * - Make clickable to navigate to playback
 * - Add keyboard accessibility
 */
export function SongHistoryItem({
  song,
  onClick,
  disabled = false,
}: SongHistoryItemProps) {
  const config = styleConfig[song.style] || styleConfig[MusicStyle.POP]
  const createdDate = new Date(song.created_at)
  const expiresDate = new Date(song.expires_at)
  const timeRemaining = getTimeRemaining(expiresDate)

  // Handle click and keyboard navigation
  const handleClick = useCallback(() => {
    if (!disabled) {
      onClick(song.song_id)
    }
  }, [song.song_id, onClick, disabled])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return

      // Enter or Space to activate
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick(song.song_id)
      }
    },
    [song.song_id, onClick, disabled]
  )

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-all',
        'hover:shadow-md hover:border-primary/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-input',
        'group'
      )}
      aria-label={`Play ${config.label} song created on ${formatDate(createdDate)}`}
      tabIndex={disabled ? -1 : 0}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left side: Style badge and content */}
        <div className="flex-1 min-w-0">
          {/* Style badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                'inline-flex items-center justify-center w-8 h-8 rounded-full text-lg',
                config.color
              )}
              aria-hidden="true"
            >
              {config.icon}
            </span>
            <span className={cn('text-sm font-semibold px-2 py-1 rounded', config.color)}>
              {config.label}
            </span>
            {song.has_variations && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                2 versions
              </span>
            )}
          </div>

          {/* Lyrics preview */}
          <p className="text-sm text-foreground line-clamp-2 mb-2">
            {song.lyrics_preview}
            {song.lyrics_preview.length === 100 && '...'}
          </p>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {/* Created date */}
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{formatDate(createdDate)}</span>
            </div>

            {/* Expiration countdown */}
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{timeRemaining.formatted}</span>
            </div>
          </div>
        </div>

        {/* Right side: Chevron icon */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <ChevronRight
            className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors"
            aria-hidden="true"
          />
        </div>
      </div>
    </button>
  )
}
