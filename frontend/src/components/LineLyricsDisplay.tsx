/**
 * Line-level lyrics display component with clickable navigation
 * 
 * Renders lyrics line by line with line-level timestamps, allowing users to:
 * - See lyrics highlighted line by line during playback
 * - Click on any line to seek to that position
 * - Auto-scroll to keep current line visible
 * - View section markers with distinct styling
 * 
 * **Feature: song-playback-improvements**
 * **Validates: Requirements 9.1, 9.2, 9.3, 8.1, 8.4**
 */

import { useEffect, useRef, useMemo } from 'react'
import type { LineCue } from '@/lib/vtt-generator'

interface LineLyricsDisplayProps {
  lineCues: LineCue[]
  currentTime: number
  onLineClick: (startTime: number) => void
  showMarkers?: boolean
  offset?: number
}

/**
 * Finds the index of the current line based on playback time
 * Returns the line where startTime <= currentTime < endTime,
 * or the most recently passed line if between lines
 */
function findCurrentLineIndex(
  lineCues: LineCue[],
  currentTime: number,
  offset: number = 0
): number {
  const adjustedTime = currentTime + offset / 1000

  // Find the line that contains the current time
  for (let i = lineCues.length - 1; i >= 0; i--) {
    if (lineCues[i].startTime <= adjustedTime) {
      return i
    }
  }

  return -1
}

export function LineLyricsDisplay({
  lineCues,
  currentTime,
  onLineClick,
  showMarkers = true,
  offset = 0,
}: LineLyricsDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const currentLineRef = useRef<HTMLDivElement>(null)

  // Find current line index
  const currentLineIndex = useMemo(
    () => findCurrentLineIndex(lineCues, currentTime, offset),
    [lineCues, currentTime, offset]
  )

  // Auto-scroll to current line
  useEffect(() => {
    if (currentLineRef.current && containerRef.current) {
      const container = containerRef.current
      const currentLine = currentLineRef.current

      // Scroll to keep current line in view (centered if possible)
      const containerHeight = container.clientHeight
      const lineTop = currentLine.offsetTop
      const lineHeight = currentLine.clientHeight

      const scrollTop = lineTop - containerHeight / 2 + lineHeight / 2
      container.scrollTop = Math.max(0, scrollTop)
    }
  }, [currentLineIndex])

  // Filter lines based on showMarkers setting
  const displayLines = useMemo(() => {
    if (showMarkers) {
      return lineCues
    }
    return lineCues.filter(cue => !cue.isMarker)
  }, [lineCues, showMarkers])

  if (displayLines.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No lyrics available</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-4 py-6 space-y-2"
      role="region"
      aria-label="Lyrics display"
    >
      {displayLines.map((cue, index) => {
        const isCurrentLine = currentLineIndex === lineCues.indexOf(cue)
        const isCurrent = isCurrentLine && !cue.isMarker

        return (
          <div
            key={cue.lineIndex}
            ref={isCurrent ? currentLineRef : null}
            onClick={() => {
              if (!cue.isMarker) {
                onLineClick(cue.startTime)
              }
            }}
            className={`
              transition-all duration-200 px-3 py-2 rounded-lg cursor-pointer
              ${
                cue.isMarker
                  ? 'text-gray-400 text-sm italic font-medium'
                  : isCurrent
                    ? 'bg-blue-100 text-blue-900 font-semibold text-lg'
                    : 'text-gray-700 hover:bg-gray-100'
              }
            `}
            role={cue.isMarker ? 'doc-subtitle' : 'button'}
            tabIndex={cue.isMarker ? -1 : 0}
            onKeyDown={(e) => {
              if (!cue.isMarker && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onLineClick(cue.startTime)
              }
            }}
            aria-label={
              cue.isMarker
                ? `Section: ${cue.text}`
                : `Line ${index + 1}: ${cue.text}. Click to seek to ${formatTime(cue.startTime)}`
            }
          >
            {cue.text}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Formats time in MM:SS format for accessibility labels
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
