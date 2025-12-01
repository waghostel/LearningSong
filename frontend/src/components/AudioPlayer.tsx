import * as React from 'react'
import { Play, Pause, Download, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { logPlaybackStart, logPlaybackPause, logPlaybackEnd } from '@/lib/analytics'

export interface AudioPlayerProps {
  songUrl: string
  songStyle?: string
  songId?: string
  variationIndex?: number
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  onError?: (error: Error) => void
  disabled?: boolean
}

/**
 * Format seconds to MM:SS display format
 * @param seconds - Time in seconds
 * @returns Formatted time string in MM:SS format with zero-padding
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00'
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Generate download filename from song style
 * @param style - Music style of the song
 * @returns Filename with style included
 */
export function generateDownloadFilename(style?: string): string {
  const timestamp = new Date().toISOString().slice(0, 10)
  const stylePart = style ? `-${style.toLowerCase()}` : ''
  return `learning-song${stylePart}-${timestamp}.mp3`
}

export function AudioPlayer({
  songUrl,
  songStyle,
  songId,
  variationIndex = 0,
  onTimeUpdate,
  onEnded,
  onError,
  disabled = false,
}: AudioPlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [hasError, setHasError] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)


  // Handle play/pause toggle
  const togglePlayPause = React.useCallback(() => {
    if (disabled || hasError || !audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((err) => {
        setHasError(true)
        onError?.(err instanceof Error ? err : new Error('Failed to play audio'))
      })
    }
  }, [disabled, hasError, isPlaying, onError])

  // Handle seek bar change
  const handleSeek = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || !audioRef.current) return
      const newTime = parseFloat(e.target.value)
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    },
    [disabled]
  )

  // Handle download
  const handleDownload = React.useCallback(async () => {
    if (disabled || !songUrl) return

    try {
      const response = await fetch(songUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = generateDownloadFilename(songStyle)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to download audio'))
    }
  }, [disabled, songUrl, songStyle, onError])

  // Audio event handlers
  const handleTimeUpdate = React.useCallback(() => {
    if (!audioRef.current) return
    const time = audioRef.current.currentTime
    const dur = audioRef.current.duration || 0
    setCurrentTime(time)
    onTimeUpdate?.(time, dur)
  }, [onTimeUpdate])

  const handleLoadedMetadata = React.useCallback(() => {
    if (!audioRef.current) return
    setDuration(audioRef.current.duration || 0)
    setIsLoading(false)
  }, [])

  const handlePlay = React.useCallback(() => {
    setIsPlaying(true)
    // Log playback start event
    // Property 27: Play event tracking
    // Requirements: 10.2
    if (songId) {
      logPlaybackStart(songId, variationIndex)
    }
  }, [songId, variationIndex])
  
  const handlePause = React.useCallback(() => {
    setIsPlaying(false)
    // Log playback pause event
    if (songId && audioRef.current) {
      logPlaybackPause(songId, variationIndex, audioRef.current.currentTime)
    }
  }, [songId, variationIndex])

  const handleEnded = React.useCallback(() => {
    setIsPlaying(false)
    // Log playback end event
    if (songId) {
      logPlaybackEnd(songId, variationIndex)
    }
    onEnded?.()
  }, [onEnded, songId, variationIndex])

  const handleError = React.useCallback(() => {
    setHasError(true)
    setIsLoading(false)
    onError?.(new Error('Failed to load audio'))
  }, [onError])

  // Reset state when URL changes
  React.useEffect(() => {
    setHasError(false)
    setIsLoading(true)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
  }, [songUrl])

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-4 rounded-lg border bg-card',
        disabled && 'opacity-50 pointer-events-none'
      )}
      role="region"
      aria-label="Audio player"
    >
      {/* Hidden audio element */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={songUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        preload="metadata"
      />

      {/* Error state */}
      {hasError && (
        <div className="flex items-center gap-2 text-destructive text-sm" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>Unable to load audio. Please try again.</span>
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlayPause}
          disabled={disabled || hasError || isLoading}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          aria-pressed={isPlaying}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>

        {/* Time display */}
        <span className="text-sm font-mono min-w-[5rem] text-center" aria-live="polite">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Seek bar */}
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            disabled={disabled || hasError || isLoading}
            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary disabled:cursor-not-allowed"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={duration || 100}
            aria-valuenow={currentTime}
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          />
          {/* Progress indicator overlay */}
          <div
            className="absolute top-0 left-0 h-2 bg-primary rounded-l-lg pointer-events-none"
            style={{ width: `${progressPercent}%` }}
            aria-hidden="true"
          />
        </div>

        {/* Download button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleDownload}
          disabled={disabled || hasError}
          aria-label="Download song"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
