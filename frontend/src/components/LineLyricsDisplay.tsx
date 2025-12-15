import * as React from 'react'
import { cn } from '@/lib/utils'
import type { LineCue } from '@/lib/vtt-generator'

export interface LineLyricsDisplayProps {
  lineCues: LineCue[]
  currentTime: number
  onLineClick: (startTime: number) => void
  showMarkers?: boolean
  offset?: number
}

const AUTO_SCROLL_DISABLE_DURATION = 5000 // 5 seconds

/**
 * Displays lyrics with line-by-line highlighting synchronization
 * 
 * **Feature: song-playback-improvements**
 * **Validates: Requirements 1.1, 1.3, 1.4, 1.5**
 */
export function LineLyricsDisplay({
  lineCues,
  currentTime,
  onLineClick,
  showMarkers = true,
  offset = 0,
}: LineLyricsDisplayProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const lineRefs = React.useRef<(HTMLDivElement | null)[]>([])
  
  const [autoScrollEnabled, setAutoScrollEnabled] = React.useState(true)
  const autoScrollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAutoScrollingRef = React.useRef(false)

  // Apply offset to current time (convert ms to seconds)
  const adjustedTime = currentTime + (offset / 1000)

  // Find the currently active line
  // A line is active if adjustedTime >= start && adjustedTime < end
  // Or if it's the last line and we're past start
  const currentLineIndex = React.useMemo(() => {
    // If we have no lines, return -1
    if (lineCues.length === 0) return -1
    
    // Find the first line where time is within bounds
    const idx = lineCues.findIndex(cue => {
      // If marker is hidden, it can't be current (conceptually)
      if (cue.isMarker && !showMarkers) return false
      return adjustedTime >= cue.startTime && adjustedTime < cue.endTime
    })

    if (idx !== -1) return idx

    // Fallback: if we are between lines, we might want to highlight upcoming?
    // Or just highlight nothing.
    // However, if we are past the last line, maybe keep last line active?
    // Let's stick to strict timing for now.
    
    // If we are past the start of the last line and it hasn't ended adequately?
    // For now, strict range check.
    return -1
  }, [lineCues, adjustedTime, showMarkers])

  // Reset refs when lineCues change
  React.useEffect(() => {
    lineRefs.current = lineRefs.current.slice(0, lineCues.length)
  }, [lineCues.length])

  // Handle manual scroll interaction
  const handleScroll = React.useCallback(() => {
    if (isAutoScrollingRef.current) return

    setAutoScrollEnabled(false)
    
    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current)
    }

    autoScrollTimeoutRef.current = setTimeout(() => {
      setAutoScrollEnabled(true)
    }, AUTO_SCROLL_DISABLE_DURATION)
  }, [])

  // Auto-scroll effect
  React.useEffect(() => {
    if (!autoScrollEnabled || currentLineIndex === -1) return

    const currentEl = lineRefs.current[currentLineIndex]
    if (currentEl && containerRef.current) {
      isAutoScrollingRef.current = true
      currentEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      setTimeout(() => {
        isAutoScrollingRef.current = false
      }, 500)
    }
  }, [currentLineIndex, autoScrollEnabled])

  // Clean up timeout
  React.useEffect(() => {
    return () => {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current)
      }
    }
  }, [])

  if (lineCues.length === 0) {
    return (
      <div 
        className="p-4 rounded-lg border bg-card text-muted-foreground text-center"
        role="region"
        aria-label="Lyrics display"
      >
        No lyrics lines available
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'p-4 rounded-lg border bg-card',
        'max-h-[400px] overflow-y-auto',
        'scroll-smooth'
      )}
      role="region"
      aria-label="Line-by-line lyrics display"
      onScroll={handleScroll}
    >
      <div className="space-y-4">
        {lineCues.map((cue, index) => {
          if (cue.isMarker && !showMarkers) return null

          const isCurrent = index === currentLineIndex
          const isPast = !isCurrent && cue.endTime <= adjustedTime
          const isFuture = !isCurrent && !isPast

          return (
            <div
              key={index}
              ref={(el) => {
                lineRefs.current[index] = el
              }}
              onClick={() => onLineClick(cue.startTime)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onLineClick(cue.startTime)
                }
              }}
              tabIndex={0}
              role="button"
              aria-current={isCurrent ? 'time' : undefined}
              className={cn(
                'p-2 rounded-md transition-all duration-300 cursor-pointer',
                'text-lg leading-snug',
                cue.isMarker && 'font-bold text-muted-foreground text-sm uppercase tracking-wider bg-muted/30',
                isCurrent && !cue.isMarker && 'bg-primary/15 font-medium text-foreground scale-[1.02] shadow-sm ring-1 ring-primary/20',
                isPast && !cue.isMarker && 'text-muted-foreground opacity-80',
                isFuture && !cue.isMarker && 'text-muted-foreground',
                // Hover effect
                'hover:bg-muted/80'
              )}
            >
              {cue.text}
            </div>
          )
        })}
      </div>
      
      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {currentLineIndex !== -1 ? `Now singing: ${lineCues[currentLineIndex].text}` : ''}
      </div>
    </div>
  )
}
