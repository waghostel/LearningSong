import * as React from 'react'
import { cn } from '@/lib/utils'
import { useLyricsSync } from '@/hooks/useLyricsSync'
import type { AlignedWord } from '@/types/lyrics'
import { 
  parseLyricsIntoSections, 
  calculateCurrentSection, 
  getWordStateClasses 
} from '@/lib/lyrics-display-utils'

export interface LyricsDisplayProps {
  lyrics: string
  currentTime: number
  duration: number
  alignedWords?: AlignedWord[]  // Optional prop for word-level timestamps
  onManualScroll?: () => void
}

const AUTO_SCROLL_DISABLE_DURATION = 5000 // 5 seconds

export function LyricsDisplay({
  lyrics,
  currentTime,
  duration,
  alignedWords,
  onManualScroll,
}: LyricsDisplayProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const sectionRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const wordRefs = React.useRef<(HTMLSpanElement | null)[]>([])
  const [autoScrollEnabled, setAutoScrollEnabled] = React.useState(true)
  const autoScrollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAutoScrollingRef = React.useRef(false)

  // Determine if we should use word-level rendering
  const hasTimestamps = alignedWords && alignedWords.length > 0

  // Use lyrics sync hook for word-level highlighting
  const { currentWordIndex, getWordState } = useLyricsSync({
    alignedWords: alignedWords ?? [],
    currentTime,
  })

  // Parse lyrics into sections (for fallback mode)
  const sections = React.useMemo(() => parseLyricsIntoSections(lyrics), [lyrics])

  // Calculate current section (for fallback mode)
  const currentSectionIndex = React.useMemo(
    () => calculateCurrentSection(currentTime, duration, sections.length),
    [currentTime, duration, sections.length]
  )

  // Handle manual scroll detection
  const handleScroll = React.useCallback(() => {
    // Ignore scroll events triggered by auto-scroll
    if (isAutoScrollingRef.current) {
      return
    }

    // Disable auto-scroll on manual scroll
    setAutoScrollEnabled(false)
    onManualScroll?.()

    // Clear existing timeout
    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current)
    }

    // Re-enable auto-scroll after 5 seconds
    autoScrollTimeoutRef.current = setTimeout(() => {
      setAutoScrollEnabled(true)
    }, AUTO_SCROLL_DISABLE_DURATION)
  }, [onManualScroll])

  // Auto-scroll to current word (word-level mode)
  React.useEffect(() => {
    if (!autoScrollEnabled || !hasTimestamps || currentWordIndex < 0) {
      return
    }

    const currentWordEl = wordRefs.current[currentWordIndex]
    if (currentWordEl && containerRef.current) {
      isAutoScrollingRef.current = true
      currentWordEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      // Reset auto-scrolling flag after animation completes
      setTimeout(() => {
        isAutoScrollingRef.current = false
      }, 500)
    }
  }, [currentWordIndex, autoScrollEnabled, hasTimestamps])

  // Auto-scroll to current section (fallback mode)
  React.useEffect(() => {
    if (!autoScrollEnabled || hasTimestamps || sections.length === 0) {
      return
    }

    const currentSectionEl = sectionRefs.current[currentSectionIndex]
    if (currentSectionEl && containerRef.current) {
      isAutoScrollingRef.current = true
      currentSectionEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      // Reset auto-scrolling flag after animation completes
      setTimeout(() => {
        isAutoScrollingRef.current = false
      }, 500)
    }
  }, [currentSectionIndex, autoScrollEnabled, sections.length, hasTimestamps])

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current)
      }
    }
  }, [])

  // Reset section refs when sections change
  React.useEffect(() => {
    sectionRefs.current = sectionRefs.current.slice(0, sections.length)
  }, [sections.length])

  // Reset word refs when alignedWords change
  React.useEffect(() => {
    wordRefs.current = wordRefs.current.slice(0, alignedWords?.length ?? 0)
  }, [alignedWords?.length])

  // Check if we have any content to display
  const hasContent = hasTimestamps || sections.length > 0

  if (!hasContent) {
    return (
      <div
        className="p-4 rounded-lg border bg-card text-muted-foreground text-center"
        role="region"
        aria-label="Lyrics display"
      >
        No lyrics available
      </div>
    )
  }

  // Word-level rendering mode (when timestamps are available)
  if (hasTimestamps && alignedWords) {
    return (
      <div
        ref={containerRef}
        className={cn(
          'p-4 rounded-lg border bg-card',
          'max-h-[400px] overflow-y-auto',
          'scroll-smooth'
        )}
        role="region"
        aria-label="Lyrics display with word-level sync"
        aria-live="polite"
        onScroll={handleScroll}
      >
        <div className="leading-relaxed font-mono text-sm">
          {alignedWords.map((alignedWord, index) => {
            const wordState = getWordState(index)
            const isCurrent = index === currentWordIndex
            
            return (
              <span
                key={index}
                ref={(el) => {
                  wordRefs.current[index] = el
                }}
                className={cn(
                  'transition-all duration-150 inline',
                  getWordStateClasses(wordState)
                )}
                aria-current={isCurrent ? 'true' : undefined}
                data-word-index={index}
                data-word-state={wordState}
              >
                {alignedWord.word}
              </span>
            )
          })}
        </div>
        
        {/* Screen reader announcement for current word */}
        <div className="sr-only" aria-live="assertive" aria-atomic="true">
          {currentWordIndex >= 0 && alignedWords[currentWordIndex]
            ? `Now singing: ${alignedWords[currentWordIndex].word}`
            : 'Waiting for lyrics'}
        </div>
      </div>
    )
  }

  // Fallback: Section-based rendering (linear interpolation)
  return (
    <div
      ref={containerRef}
      className={cn(
        'p-4 rounded-lg border bg-card',
        'max-h-[400px] overflow-y-auto',
        'scroll-smooth'
      )}
      role="region"
      aria-label="Lyrics display"
      aria-live="polite"
      onScroll={handleScroll}
    >
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div
            key={index}
            ref={(el) => {
              sectionRefs.current[index] = el
            }}
            className={cn(
              'p-3 rounded-md transition-all duration-300',
              'whitespace-pre-wrap font-mono text-sm',
              index === currentSectionIndex
                ? 'bg-primary/10 border-l-4 border-primary text-foreground'
                : 'text-muted-foreground hover:bg-muted/50'
            )}
            aria-current={index === currentSectionIndex ? 'true' : undefined}
            data-section-index={index}
          >
            {section}
          </div>
        ))}
      </div>
      
      {/* Screen reader announcement for current section */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {`Now playing section ${currentSectionIndex + 1} of ${sections.length}`}
      </div>
    </div>
  )
}
