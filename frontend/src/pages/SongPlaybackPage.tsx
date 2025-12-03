import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useRateLimit } from '@/hooks/useLyrics'
import { useSongPlaybackStore } from '@/stores/songPlaybackStore'
import { useSongSwitcher } from '@/hooks/useSongSwitcher'
import { Button } from '@/components/ui/button'
import { AudioPlayer } from '@/components/AudioPlayer'
import { LyricsDisplay } from '@/components/LyricsDisplay'
import { LineLyricsDisplay } from '@/components/LineLyricsDisplay'
import { SongMetadata } from '@/components/SongMetadata'
import { ShareButton } from '@/components/ShareButton'
import { SongSwitcher } from '@/components/SongSwitcher'
import { OffsetControl } from '@/components/OffsetControl'
import { MarkerVisibilityToggle, loadMarkerVisibility } from '@/components/MarkerVisibilityToggle'
import { SyncModeToggle, loadSyncMode, saveSyncMode, type SyncMode } from '@/components/SyncModeToggle'
import { VttDownloadButton } from '@/components/VttDownloadButton'
import { RateLimitIndicator } from '@/components/RateLimitIndicator'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { PageNavigation } from '@/components/PageNavigation'
import { RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react'
import { getTimeRemaining } from '@/lib/song-metadata-utils'
import { mapErrorToUserFriendly } from '@/lib/error-mapping-utils'
import { loadOffset, saveOffset } from '@/lib/offset-storage'
import { hasMarkers } from '@/lib/section-marker-utils'
import { aggregateWordsToLines } from '@/lib/vtt-generator'

export function SongPlaybackPage() {
  const { songId: songIdParam, shareToken } = useParams<{ songId?: string; shareToken?: string }>()
  const navigate = useNavigate()
  const { loading: authLoading } = useAuth()
  const { isOnline, wasOffline, checkConnection } = useNetworkStatus()
  const { data: rateLimitData } = useRateLimit()

  const {
    songId,
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
    songVariations,
    primaryVariationIndex,
    loadSong,
    loadSharedSong,
    setCurrentTime,
    setDuration,
    setPrimaryVariationIndex,
    reset,
  } = useSongPlaybackStore()

  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [audioError, setAudioError] = useState<Error | null>(null)
  
  // Offset state for lyrics timing adjustment
  // Requirements: 2.3, 2.4
  // Note: We'll load the offset in an effect after songId is available
  const [offset, setOffset] = useState<number>(0)
  const [offsetLoaded, setOffsetLoaded] = useState(false)
  
  // Marker visibility state
  // Requirements: 14.1, 14.4, 14.5
  const [showMarkers, setShowMarkers] = useState<boolean>(() => loadMarkerVisibility())
  
  // Sync mode state for word vs line-level highlighting
  // Requirements: 9.5
  const [syncMode, setSyncMode] = useState<SyncMode>(() => loadSyncMode())

  // Initialize song switcher hook
  // Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 6.5
  const {
    activeIndex,
    isLoading: isSwitching,
    error: switchingError,
    switchVariation,
    clearError: clearSwitchError,
  } = useSongSwitcher({
    taskId: songId || '',
    variations: songVariations,
    initialIndex: primaryVariationIndex,
    onSwitch: (index) => {
      // Update store with new primary variation
      setPrimaryVariationIndex(index)
      // Update audio player source to new variation
      if (songVariations[index]) {
        // The audio player will automatically update via the songUrl change
      }
    },
    onError: () => {
      // Error is already set in the hook state
    },
  })

  // Determine if song is expired
  const isExpired = expiresAt ? getTimeRemaining(expiresAt).isExpired : false

  // Get the current variation's audio URL
  // Requirements: 3.3 - Update audio player source to new song URL
  const currentVariationUrl = songVariations[activeIndex]?.audio_url || songUrl

  // Load song data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        if (shareToken) {
          await loadSharedSong(shareToken)
        } else if (songIdParam) {
          await loadSong(songIdParam)
        } else {
          // No song ID or share token, redirect to home
          navigate('/', { replace: true })
        }
      } catch {
        // Error is already set in the store
      }
    }

    loadData()
  }, [songIdParam, shareToken, loadSong, loadSharedSong, navigate])

  // Load offset from localStorage when song changes
  // Requirements: 2.4
  useEffect(() => {
    if (songId && !offsetLoaded) {
      const savedOffset = loadOffset(songId)
      setOffset(savedOffset)
      setOffsetLoaded(true)
    }
  }, [songId, offsetLoaded])

  // Handle offset changes and persist to localStorage
  // Requirements: 2.3
  const handleOffsetChange = useCallback(
    (newOffset: number) => {
      setOffset(newOffset)
      if (songId) {
        saveOffset(songId, newOffset)
      }
    },
    [songId]
  )

  // Handle sync mode changes and persist to localStorage
  // Requirements: 9.5
  const handleSyncModeChange = useCallback(
    (newMode: SyncMode) => {
      setSyncMode(newMode)
      saveSyncMode(newMode)
    },
    []
  )

  // Generate line cues from aligned words and edited lyrics
  // Requirements: 7.2, 7.3, 7.4
  const lineCues = useMemo(() => {
    if (!alignedWords || alignedWords.length === 0 || !lyrics) {
      return []
    }
    try {
      return aggregateWordsToLines(alignedWords, lyrics)
    } catch (error) {
      console.error('Failed to aggregate words to lines:', error)
      return []
    }
  }, [alignedWords, lyrics])

  // Handle line click navigation
  // Requirements: 8.2, 8.3, 8.5
  const handleLineClick = useCallback(
    (startTime: number) => {
      // This will be connected to the audio player's seek functionality
      // The AudioPlayer component will handle the actual seeking
      setCurrentTime(startTime)
    },
    [setCurrentTime]
  )

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
            <div className="flex items-center gap-4">
              <PageNavigation />
              <RateLimitIndicator />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="container mx-auto px-4 py-8" role="main" tabIndex={-1}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back Button and History Link */}
          <nav aria-label="Page navigation" className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Go back to home page"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to Home
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/history')}
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Go to my songs history"
            >
              My Songs
            </Button>
          </nav>

          {/* Audio Player */}
          <section id="audio-player" aria-labelledby="player-section-title">
            <h2 id="player-section-title" className="sr-only">Audio player section</h2>
            {currentVariationUrl && (
              <AudioPlayer
                songUrl={currentVariationUrl}
                songStyle={style || undefined}
                songId={songId || undefined}
                variationIndex={activeIndex}
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
            
            {/* Song Switcher - positioned near audio player controls */}
            {/* Requirements: 2.5 - Display switcher in prominent location near audio player */}
            {songVariations.length >= 2 && (
              <div className="mt-4">
                <SongSwitcher
                  variations={songVariations}
                  activeIndex={activeIndex}
                  onSwitch={switchVariation}
                  isLoading={isSwitching}
                  disabled={isExpired}
                />
              </div>
            )}
            
            {/* Variation switch error */}
            {switchingError && !isExpired && (
              <div className="mt-2 p-3 rounded bg-destructive/10 text-destructive text-sm" role="alert">
                <AlertCircle className="inline h-4 w-4 mr-2" />
                {switchingError}
                <button
                  onClick={clearSwitchError}
                  className="ml-2 underline hover:no-underline"
                  aria-label="Dismiss error"
                >
                  Dismiss
                </button>
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

          {/* Offset Control - positioned near lyrics panel */}
          {/* Requirements: 3.1 - Show only when timestamped lyrics available */}
          {alignedWords && alignedWords.length > 0 && (
            <section aria-labelledby="offset-section-title">
              <h2 id="offset-section-title" className="sr-only">Lyrics timing adjustment</h2>
              <OffsetControl
                offset={offset}
                onChange={handleOffsetChange}
                disabled={isExpired}
              />
            </section>
          )}

          {/* Marker Visibility Toggle - positioned near lyrics panel */}
          {/* Requirements: 14.1 - Show toggle only when section markers exist */}
          {alignedWords && hasMarkers(alignedWords) && (
            <section aria-labelledby="marker-toggle-section-title">
              <h2 id="marker-toggle-section-title" className="sr-only">Section marker visibility</h2>
              <MarkerVisibilityToggle
                showMarkers={showMarkers}
                onChange={setShowMarkers}
                disabled={isExpired}
              />
            </section>
          )}

          {/* Sync Mode Toggle - positioned near lyrics panel */}
          {/* Requirements: 9.5 - Show toggle when line cues available */}
          {lineCues.length > 0 && (
            <section aria-labelledby="sync-mode-section-title">
              <h2 id="sync-mode-section-title" className="sr-only">Lyrics synchronization mode</h2>
              <SyncModeToggle
                mode={syncMode}
                onChange={handleSyncModeChange}
                disabled={isExpired}
              />
            </section>
          )}

          {/* Lyrics Display - conditionally render based on sync mode */}
          {/* Requirements: 7.1, 8.1, 9.1 */}
          <section aria-labelledby="lyrics-section-title">
            <h2 id="lyrics-section-title" className="text-lg font-semibold mb-3">Lyrics</h2>
            
            {syncMode === 'line' && lineCues.length > 0 ? (
              // Line-level sync display
              <LineLyricsDisplay
                lineCues={lineCues}
                currentTime={currentTime}
                onLineClick={handleLineClick}
                showMarkers={showMarkers}
                offset={offset}
              />
            ) : (
              // Word-level sync display (default)
              <LyricsDisplay
                lyrics={lyrics}
                currentTime={currentTime}
                duration={duration}
                alignedWords={alignedWords}
                offset={offset}
                showMarkers={showMarkers}
              />
            )}
          </section>

          {/* Action Buttons */}
          <section aria-labelledby="actions-section-title" className="flex flex-wrap gap-3">
            <h2 id="actions-section-title" className="sr-only">Song actions section</h2>
            
            {/* Share Button - only show for owners */}
            {isOwner && songId && !isExpired && (
              <ShareButton songId={songId} disabled={!isOnline} />
            )}

            {/* VTT Download Button - show when line cues available */}
            {/* Requirements: 10.1, 10.2, 10.3, 10.4, 10.5 */}
            {lineCues.length > 0 && style && createdAt && (
              <VttDownloadButton
                lineCues={lineCues}
                songStyle={style}
                createdAt={createdAt}
                offset={offset}
                disabled={isExpired}
              />
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
