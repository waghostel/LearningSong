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
import { PageNavigation } from '@/components/PageNavigation'

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
    songId,
    songUrl,
    songVariations,
    primaryVariationIndex,
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
    if (generationStatus === 'completed' && songUrl && songId) {
      // Send browser notification
      sendNotification('Your song is ready!', {
        body: 'Click to listen to your learning song',
        icon: '/logo.png'
      })
      
      // Navigate to Page C (playback page) with songId
      // Pass song data via navigation state as backup
      // Requirements: 2.5 - Pass variations to playback page
      navigate(`/playback/${songId}`, {
        state: {
          songUrl,
          lyrics: editedLyrics,
          style: selectedStyle,
          variations: songVariations,
          primaryVariationIndex,
        }
      })
    }
  }, [generationStatus, songUrl, songId, sendNotification, navigate, editedLyrics, selectedStyle, songVariations, primaryVariationIndex])

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
    <div className="h-screen flex flex-col bg-background">
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
      </nav>

      {/* Header */}
      <header className="border-b shrink-0" role="banner">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h1 className="text-2xl font-bold tracking-tight">LearningSong</h1>
              <p className="text-muted-foreground text-sm">
                Edit your lyrics and generate your song
              </p>
            </div>
            <div className="flex items-center gap-4">
              <PageNavigation />
              <RateLimitIndicator />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - flex container for editbox to fill space */}
      <main id="main-content" className="flex-1 flex flex-col min-h-0 container mx-auto px-4 py-4" role="main" tabIndex={-1}>
        <div className="max-w-4xl mx-auto flex-1 flex flex-col min-h-0 w-full">
          {/* Page Title and Back Button */}
          <div className="space-y-1 text-left mb-3 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold" id="page-title">Edit Your Lyrics</h2>
              <Button
                variant="link"
                onClick={handleBackToEdit}
                disabled={isGenerating}
                className="text-blue-600 hover:text-blue-800 p-0 h-auto focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Go back to edit content page"
              >
                <span aria-hidden="true">←</span> Back to Text Input
              </Button>
            </div>
            <p className="text-muted-foreground text-sm" id="page-description">
              Review and modify the AI-generated lyrics.
            </p>
          </div>

          {/* Lyrics Editor - fills remaining space */}
          <section aria-labelledby="lyrics-section-title" className="flex-1 flex flex-col min-h-0">
            <h3 id="lyrics-section-title" className="sr-only">Lyrics editor section</h3>
            <LyricsEditor />
          </section>
        </div>
      </main>

      {/* Sticky Footer with Style Selector + Generate Button */}
      <footer className="border-t bg-background shrink-0" role="contentinfo">
        <div className="container mx-auto px-4 py-3">
          <div className="max-w-4xl mx-auto space-y-3">
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
          </div>
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
