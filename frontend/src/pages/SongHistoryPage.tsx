import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { getSongHistory, type SongHistorySummary } from '@/api/songs'
import { SongHistoryItem } from '@/components/SongHistoryItem'
import { PageNavigation } from '@/components/PageNavigation'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle, Music } from 'lucide-react'

/**
 * SongHistoryPage component for displaying user's previously created songs
 * Requirements: 4.1, 4.5, 5.2, 5.3
 * 
 * - Fetch song history on mount
 * - Display loading state
 * - Display empty state when no songs
 * - Render list of SongHistoryItem components
 * - Navigate to playback page on item click
 */
export function SongHistoryPage() {
  const { userId, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { isOnline, wasOffline, checkConnection } = useNetworkStatus()

  const [songs, setSongs] = useState<SongHistorySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch song history on mount
  // Requirements: 4.1
  useEffect(() => {
    const fetchHistory = async () => {
      if (!userId) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const history = await getSongHistory()
        setSongs(history)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load song history'
        setError(errorMessage)
        console.error('Failed to fetch song history:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [userId])

  // Handle song item click - navigate to playback page
  // Requirements: 5.2, 5.3
  const handleSongClick = useCallback(
    (songId: string) => {
      navigate(`/playback/${songId}`)
    },
    [navigate]
  )

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigate('/')
  }, [navigate])

  // Show loading state while authenticating
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="border-b shrink-0" role="banner">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h1 className="text-3xl font-bold tracking-tight">LearningSong</h1>
              <p className="text-muted-foreground mt-1">Your song history</p>
            </div>
            <PageNavigation />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 container mx-auto px-4 py-8" role="main" tabIndex={-1}>
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

          {/* Page Title */}
          <section aria-labelledby="history-title">
            <h2 id="history-title" className="text-2xl font-semibold">
              My Songs
            </h2>
            <p className="text-muted-foreground mt-1">
              Your previously created songs are available for 48 hours
            </p>
          </section>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                <p className="text-muted-foreground">Loading your songs...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div
              className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <h3 className="font-semibold">Unable to Load Songs</h3>
                  <p className="text-sm mt-1">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="mt-3"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && songs.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <div className="flex justify-center">
                <Music className="h-16 w-16 text-muted-foreground/50" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold">No songs yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Create your first learning song by pasting educational content on the home page.
                Your songs will appear here for 48 hours.
              </p>
              <Button onClick={handleBack}>Create a Song</Button>
            </div>
          )}

          {/* Songs List */}
          {!isLoading && !error && songs.length > 0 && (
            <section aria-labelledby="songs-list-title">
              <h3 id="songs-list-title" className="sr-only">
                List of your songs
              </h3>
              <div className="space-y-3">
                {songs.map((song) => (
                  <SongHistoryItem
                    key={song.song_id}
                    song={song}
                    onClick={handleSongClick}
                    disabled={!isOnline}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 shrink-0" role="contentinfo">
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
