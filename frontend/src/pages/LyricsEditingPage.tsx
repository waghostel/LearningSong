import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSongGeneration } from '@/hooks/useSongGeneration'
import { useNotifications } from '@/hooks/useNotifications'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import { Button } from '@/components/ui/button'
import { LyricsEditor } from '@/components/LyricsEditor'
import { StyleSelector } from '@/components/StyleSelector'
import { GenerateSongButton } from '@/components/GenerateSongButton'
import { ProgressTracker } from '@/components/ProgressTracker'
import { RateLimitIndicator } from '@/components/RateLimitIndicator'
import { OfflineIndicator } from '@/components/OfflineIndicator'

interface LocationState {
  lyrics: string
  contentHash: string
}

export function LyricsEditingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userId, loading: authLoading, error: authError } = useAuth()
  const { sendNotification } = useNotifications()
  const { isOnline, wasOffline, checkConnection } = useNetworkStatus()
  
  const {
    originalLyrics,
    editedLyrics,
    selectedStyle,
    contentHash,
    setOriginalLyrics,
    setContentHash,
    generationStatus,
    songUrl,
    reset
  } = useLyricsEditingStore()
  
  const { 
    generate, 
    retry, 
    isGenerating, 
    isConnected, 
    canRetry,
    connectionStatus,
    reconnectAttempts,
    maxReconnectAttempts,
    manualReconnect,
  } = useSongGeneration()
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Initialize store with data from navigation state
  useEffect(() => {
    const state = location.state as LocationState | null
    
    if (state?.lyrics && state?.contentHash) {
      setOriginalLyrics(state.lyrics)
      setContentHash(state.contentHash)
    } else if (!originalLyrics) {
      // No lyrics data, redirect to home
      navigate('/', { replace: true })
    }
  }, [location.state, navigate, originalLyrics, setOriginalLyrics, setContentHash])

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(editedLyrics !== originalLyrics)
  }, [editedLyrics, originalLyrics])

  // Handle song generation completion
  useEffect(() => {
    if (generationStatus === 'completed' && songUrl) {
      // Send browser notification
      sendNotification('Your song is ready!', {
        body: 'Click to listen to your learning song',
        icon: '/logo.png'
      })
      
      // TODO: Navigate to Page C (playback page) when it's implemented
      // navigate('/playback', { state: { songUrl } })
    }
  }, [generationStatus, songUrl, sendNotification])

  const handleGenerateSong = () => {
    generate({
      lyrics: editedLyrics,
      style: selectedStyle,
      content_hash: contentHash
    })
  }

  const handleBackToEdit = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes to your lyrics. Are you sure you want to go back?'
      )
      if (!confirmed) return
    }
    
    reset()
    navigate('/')
  }

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

  // Show error state if authentication failed
  if (authError || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-600 text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold">Authentication Error</h2>
          <p className="text-muted-foreground">
            {authError?.message || 'Unable to authenticate. Please refresh the page.'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
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
          href="#lyrics-editor"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-48 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to lyrics editor
        </a>
        <a
          href="#generate-song-button"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-96 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to generate button
        </a>
      </nav>

      {/* Header */}
      <header className="border-b" role="banner">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h1 className="text-3xl font-bold tracking-tight">LearningSong</h1>
              <p className="text-muted-foreground mt-1">
                Edit your lyrics and generate your song
              </p>
            </div>
            <RateLimitIndicator />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="container mx-auto px-4 py-8" role="main" tabIndex={-1}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Title */}
          <div className="space-y-2 text-left">
            <h2 className="text-2xl font-semibold" id="page-title">Edit Your Lyrics</h2>
            <p className="text-muted-foreground" id="page-description">
              Review and modify the AI-generated lyrics, then select a music style to create your song.
            </p>
          </div>

          {/* Back Button */}
          <nav aria-label="Page navigation">
            <Button
              variant="outline"
              onClick={handleBackToEdit}
              disabled={isGenerating}
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Go back to edit content page"
            >
              <span aria-hidden="true">←</span> Back to Edit Content
            </Button>
          </nav>

          {/* Lyrics Editor */}
          <section aria-labelledby="lyrics-section-title">
            <h3 id="lyrics-section-title" className="sr-only">Lyrics editor section</h3>
            <LyricsEditor />
          </section>

          {/* Style Selector */}
          <section aria-labelledby="style-section-title">
            <h3 id="style-section-title" className="sr-only">Music style selection section</h3>
            <StyleSelector />
          </section>

          {/* Progress Tracker (shown when generating or failed) */}
          {(isGenerating || generationStatus === 'failed') && (
            <section aria-labelledby="progress-section-title">
              <h3 id="progress-section-title" className="sr-only">Song generation progress section</h3>
              <ProgressTracker 
                isConnected={isConnected}
                connectionStatus={connectionStatus}
                reconnectAttempts={reconnectAttempts}
                maxReconnectAttempts={maxReconnectAttempts}
                onRetry={canRetry ? retry : undefined}
                onReconnect={manualReconnect}
              />
            </section>
          )}

          {/* Generate Button */}
          <section aria-labelledby="generate-section-title">
            <h3 id="generate-section-title" className="sr-only">Generate song section</h3>
            <GenerateSongButton
              onClick={handleGenerateSong}
              isOffline={!isOnline}
            />
          </section>

          {/* Help Text */}
          <aside 
            className="text-sm text-muted-foreground space-y-2 pt-4 border-t text-left"
            aria-labelledby="tips-heading"
          >
            <h3 id="tips-heading" className="font-medium">Tips:</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Keep lyrics between 50-3000 characters for best results</li>
              <li>Choose a music style that matches your learning content</li>
              <li>Song generation takes 30-60 seconds</li>
              <li>You'll receive a notification when your song is ready</li>
              <li>Use <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Ctrl</kbd>+<kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd> to quickly generate</li>
            </ul>
          </aside>
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
