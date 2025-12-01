import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { TextInputArea } from '@/components/TextInputArea'
import { SearchToggle } from '@/components/SearchToggle'
import { RateLimitIndicator } from '@/components/RateLimitIndicator'
import { GenerateButton } from '@/components/GenerateButton'
import { LoadingProgress } from '@/components/LoadingProgress'
import { PageNavigation } from '@/components/PageNavigation'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTextInputStore } from '@/stores/textInputStore'
import { HelpCircle } from 'lucide-react'

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
    <div className="h-screen flex flex-col bg-background">
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="border-b shrink-0" role="banner">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h1 className="text-2xl font-bold tracking-tight">LearningSong</h1>
              <p className="text-muted-foreground text-sm">
                Transform your learning materials into memorable songs
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
      <main id="main-content" className="flex-1 flex flex-col min-h-0 container mx-auto px-4 py-4" role="main">
        <div className="max-w-4xl mx-auto flex-1 flex flex-col min-h-0 w-full">
          {/* Page Title and Description */}
          <div className="space-y-1 text-left mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Paste Your Learning Material</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Tips for creating learning songs"
                    >
                      <HelpCircle className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1.5 text-sm">
                      <p className="font-medium">Tips:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-xs">
                        <li>Provide clear and structured educational content</li>
                        <li>Enable Google Search for short content</li>
                        <li>You can generate up to 3 songs per day</li>
                        <li>Use Ctrl+Enter to quickly generate</li>
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-muted-foreground text-sm">
              Paste your educational content below. You can input up to 10,000 words.
            </p>
          </div>

          {/* Text Input Area - fills remaining space */}
          <section aria-labelledby="input-section-title" className="flex-1 flex flex-col min-h-0">
            <h3 id="input-section-title" className="sr-only">Educational content input</h3>
            <TextInputArea />
          </section>
        </div>
      </main>

      {/* Sticky Footer with Search Toggle + Generate Button */}
      <footer className="border-t bg-background shrink-0" role="contentinfo">
        <div className="container mx-auto px-4 py-3">
          <div className="max-w-4xl mx-auto space-y-3">
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
          </div>
        </div>
      </footer>
    </div>
  )
}
