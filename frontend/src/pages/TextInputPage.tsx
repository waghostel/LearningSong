import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { TextInputArea } from '@/components/TextInputArea'
import { SearchToggle } from '@/components/SearchToggle'
import { RateLimitIndicator } from '@/components/RateLimitIndicator'
import { GenerateButton } from '@/components/GenerateButton'
import { LoadingProgress } from '@/components/LoadingProgress'
import { useTextInputStore } from '@/stores/textInputStore'

export function TextInputPage() {
  const { userId, loading: authLoading, error: authError } = useAuth()
  const { isGenerating } = useTextInputStore()

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
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="border-b" role="banner">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h1 className="text-3xl font-bold tracking-tight">LearningSong</h1>
              <p className="text-muted-foreground mt-1">
                Transform your learning materials into memorable songs
              </p>
            </div>
            <RateLimitIndicator />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="container mx-auto px-4 py-8" role="main">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Title and Description */}
          <div className="space-y-2 text-left">
            <h2 className="text-2xl font-semibold">Create Your Learning Song</h2>
            <p className="text-muted-foreground">
              Paste your educational content below and let AI transform it into engaging song lyrics.
              You can input up to 10,000 words.
            </p>
          </div>

          {/* Text Input Area */}
          <section aria-labelledby="input-section-title" className="space-y-4">
            <h3 id="input-section-title" className="sr-only">Educational content input</h3>
            <TextInputArea />
          </section>

          {/* Search Toggle */}
          <section aria-labelledby="search-section-title">
            <h3 id="search-section-title" className="sr-only">Search enrichment options</h3>
            <SearchToggle />
          </section>

          {/* Loading Progress (shown when generating) */}
          {isGenerating && <LoadingProgress />}

          {/* Generate Button */}
          <section aria-labelledby="generate-section-title">
            <h3 id="generate-section-title" className="sr-only">Generate lyrics</h3>
            <GenerateButton />
          </section>

          {/* Help Text */}
          <aside 
            className="text-sm text-muted-foreground space-y-2 pt-4 border-t text-left"
            aria-labelledby="tips-heading"
          >
            <p id="tips-heading" className="font-medium">Tips:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>For best results, provide clear and structured educational content</li>
              <li>Enable Google Search for short content to add relevant context</li>
              <li>You can generate up to 3 songs per day</li>
              <li>Use Ctrl+Enter (or Cmd+Enter on Mac) as a keyboard shortcut</li>
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
    </div>
  )
}
