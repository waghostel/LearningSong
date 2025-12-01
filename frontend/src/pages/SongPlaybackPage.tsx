import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useRateLimit } from '@/hooks/useLyrics'
import { useSongPlaybackStore } from '@/stores/songPlaybackStore'
import { Button } from '@/components/ui/button'
import { AudioPlayer } from '@/components/AudioPlayer'
import { LyricsDisplay } from '@/components/LyricsDisplay'
import { SongMetadata } from '@/components/SongMetadata'
import { ShareButton } from '@/components/ShareButton'
import { RateLimitIndicator } from '@/components/RateLimitIndicator'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react'
import { getTimeRemaining } from '@/components/SongMetadata'

/**
 * Map API/backend error messages to user-friendly messages
 * Property 7: Error Message User-Friendliness - no technical details exposed
 */
export function mapErrorToUserFriendly(error: string | Error | null): string {
  if (!error) return 'An unexpected error occurred. Please try again.'
  
  const errorMessage = typeof error === 'string' ? error : error.message
  const lowerMessage = errorMessage.toLowerCase()
  
  // Map known error patterns to user-friendly messages
  if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
    return 'This song could not be found. It may have been deleted.'
  }
  if (lowerMessage.includes('410') || lowerMessage.includes('expired')) {
    return 'This song has expired and is no longer available.'
  }
  if (lowerMessage.includes('403') || lowerMessage.includes('forbidden') || lowerMessage.includes('unauthorized')) {
    return 'You do not have permission to access this song.'
  }
  if (lowerMessage.includes('429') || lowerMessage.includes('rate limit')) {
    return "You've reached your daily limit. Please try again tomorrow."
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('offline') || lowerMessage.includes('fetch')) {
    return 'Unable to connect. Please check your internet connection.'
  }
  if (lowerMessage.includes('timeout')) {
    return 'The request took too long. Please try again.'
  }
  
  // Default user-friendly message - never expose technical details
  return 'Something went wrong. Please try again later.'
}

export function SongPlaybackPage() {
  const { songId, shareToken } = useParams<{ songId?: string; shareToken?: string }>()
  const navigate = useNavigate()
  const { loading: authLoading } = useAuth()
  const { isOnline, wasOffline, checkConnection } = useNetworkStatus()
  const { data: rateLimitData } = useRateLimit()

  const {
    songUrl,
    lyrics,
    style,
    createdAt,
    expiresAt,
    isOwner,
    isLoading,
    error,
    currentTime,
    duration,
    alignedWords,
    loadSong,
    loadSharedSong,
    setCurrentTime,
    setDuration,
    reset,
  } = useSongPlaybackStore()

  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [audioError, setAudioError] = useState<Error | null>(null)

  // Determine if song is expired
  const isExpired = expiresAt ? getTimeRemaining(expiresAt).isExpired : false

  // Load song data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        if (shareToken) {
          await loadSharedSong(shareToken)
        } else if (songId) {
          await loadSong(songId)
        } else {
          // No song ID or share token, redirect to home
          navigate('/', { replace: true })
        }
      } catch {
        // Error is already set in the store
      }
    }

    loadData()
  }, [songId, shareToken, loadSong, loadSharedSong, navigate])

  // Handle time updates from audio player
  const handleTimeUpdate = useCallback(
    (time: number, dur: number) => {
      setCurrentTime(time)
      setDuration(dur)
    },
    [setCurrentTime, setDuration]
  )

  // Handle audio errors
  const handleAudioError = useCallback((err: Error) => {
    setAudioError(err)
  }, [])

  // Handle regenerate button click
  const handleRegenerateClick = () => {
    setShowRegenerateConfirm(true)
  }

  // Handle regenerate confirmation
  const handleRegenerateConfirm = () => {
    setShowRegenerateConfirm(false)
    
    // Check rate limit
    if (rateLimitData && rateLimitData.remaining <= 0) {
      // Rate limit exceeded - don't navigate
      return
    }

    // Navigate to Page B with lyrics pre-filled
    navigate('/lyrics-edit', {
      state: {
        lyrics: lyrics,
        contentHash: '', // Will be regenerated
      },
    })
  }

  // Handle regenerate cancel
  const handleRegenerateCancel = () => {
    setShowRegenerateConfirm(false)
  }

  // Handle back navigation
  const handleBack = () => {
    reset()
    navigate('/')
  }

  // Show loading state while authenticating or loading song
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">
            {authLoading ? 'Authenticating...' : 'Loading song...'}
          </p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || (!songUrl && !isLoading)) {
    const userFriendlyError = mapErrorToUserFriendly(error)
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Unable to Load Song</h2>
          <p className="text-muted-foreground">{userFriendlyError}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Home
            </Button>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Skip links for keyboard navigation */}
      <nav aria-label="Skip links" className="sr-only focus-within:not-sr-only">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <a
          href="#audio-player"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-48 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to audio player
        </a>
      </nav>

      {/* Header */}
      <header className="border-b" role="banner">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h1 className="text-3xl font-bold tracking-tight">LearningSong</h1>
              <p className="text-muted-foreground mt-1">Your song is ready to play</p>
            </div>
            <RateLimitIndicator />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="container mx-auto px-4 py-8" role="main" tabIndex={-1}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back Button */}
          <nav aria-label="Page navigation">
            <Button
              variant="outline"
              onClick={handleBack}
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Go back to home page"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to Home
            </Button>
          </nav>

          {/* Audio Player */}
          <section id="audio-player" aria-labelledby="player-section-title">
            <h2 id="player-section-title" className="sr-only">Audio player section</h2>
            {songUrl && (
              <AudioPlayer
                songUrl={songUrl}
                songStyle={style || undefined}
                onTimeUpdate={handleTimeUpdate}
                onError={handleAudioError}
                disabled={isExpired}
              />
            )}
            {audioError && !isExpired && (
              <div className="mt-2 p-3 rounded bg-destructive/10 text-destructive text-sm" role="alert">
                <AlertCircle className="inline h-4 w-4 mr-2" />
                Unable to load audio. Please try again.
              </div>
            )}
          </section>

          {/* Song Metadata */}
          {style && createdAt && expiresAt && (
            <section aria-labelledby="metadata-section-title">
              <h2 id="metadata-section-title" className="sr-only">Song information section</h2>
              <SongMetadata style={style} createdAt={createdAt} expiresAt={expiresAt} />
            </section>
          )}

          {/* Lyrics Display */}
          <section aria-labelledby="lyrics-section-title">
            <h2 id="lyrics-section-title" className="text-lg font-semibold mb-3">Lyrics</h2>
            <LyricsDisplay
              lyrics={lyrics}
              currentTime={currentTime}
              duration={duration}
              alignedWords={alignedWords}
            />
          </section>

          {/* Action Buttons */}
          <section aria-labelledby="actions-section-title" className="flex flex-wrap gap-3">
            <h2 id="actions-section-title" className="sr-only">Song actions section</h2>
            
            {/* Share Button - only show for owners */}
            {isOwner && songId && !isExpired && (
              <ShareButton songId={songId} disabled={!isOnline} />
            )}

            {/* Regenerate Button */}
            {!isExpired && (
              <Button
                variant="outline"
                onClick={handleRegenerateClick}
                disabled={!isOnline || (rateLimitData && rateLimitData.remaining <= 0)}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Regenerate Song
              </Button>
            )}
          </section>

          {/* Regenerate Confirmation Dialog */}
          {showRegenerateConfirm && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              role="dialog"
              aria-modal="true"
              aria-labelledby="regenerate-dialog-title"
            >
              <div className="bg-background p-6 rounded-lg shadow-lg max-w-md mx-4 space-y-4">
                <h3 id="regenerate-dialog-title" className="text-lg font-semibold">
                  Regenerate Song?
                </h3>
                
                {rateLimitData && rateLimitData.remaining <= 0 ? (
                  <>
                    <p className="text-muted-foreground">
                      You've reached your daily limit of {rateLimitData.total_limit ?? 3} songs. Your limit will reset at{' '}
                      {new Date(rateLimitData.reset_time).toLocaleTimeString()}.
                    </p>
                    <div className="flex justify-end">
                      <Button onClick={handleRegenerateCancel}>OK</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      This will use 1 of your {rateLimitData?.remaining ?? 3} remaining songs for today.
                      You'll be taken to the lyrics editor to create a new version.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={handleRegenerateCancel}>
                        Cancel
                      </Button>
                      <Button onClick={handleRegenerateConfirm}>
                        Continue
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12" role="contentinfo">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            LearningSong - Making learning memorable through music
          </p>
        </div>
      </footer>

      {/* Offline Indicator */}
      <OfflineIndicator
        isOnline={isOnline}
        wasOffline={wasOffline}
        onRetry={checkConnection}
      />
    </div>
  )
}
