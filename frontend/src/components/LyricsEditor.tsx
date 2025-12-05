import * as React from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import { cn } from '@/lib/utils'

const MAX_CHARS = 3000
const WARNING_THRESHOLD = 2700
const MIN_CHARS = 50

export const LyricsEditor: React.FC = () => {
  const { editedLyrics, setEditedLyrics } = useLyricsEditingStore()
  
  const charCount = editedLyrics.length
  const isWarning = charCount >= WARNING_THRESHOLD && charCount <= MAX_CHARS
  const isError = charCount > MAX_CHARS
  const isTooShort = charCount > 0 && charCount < MIN_CHARS
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedLyrics(e.target.value)
  }
  
  // Get status message for screen readers
  const getStatusMessage = () => {
    if (isError) return `Error: Lyrics exceed maximum length of ${MAX_CHARS} characters. Current count: ${charCount}`
    if (isWarning) return `Warning: Approaching character limit. ${MAX_CHARS - charCount} characters remaining`
    if (isTooShort) return `Note: Minimum ${MIN_CHARS} characters required. ${MIN_CHARS - charCount} more needed`
    return `${charCount} of ${MAX_CHARS} characters used`
  }
  
  // Get help text based on state
  const getHelpText = () => {
    if (isError) return 'Lyrics exceed maximum length. Please shorten your text.'
    if (isWarning) return `Approaching character limit. ${MAX_CHARS - charCount} characters remaining.`
    if (isTooShort) return `Minimum ${MIN_CHARS} characters required for song generation.`
    return 'Edit your lyrics as needed. Undo/redo supported (Ctrl+Z/Ctrl+Y).'
  }
  
  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardContent className="p-4 flex-1 flex flex-col min-h-0 gap-2">
        <div role="group" aria-labelledby="lyrics-editor-label" className="flex-1 flex flex-col min-h-0">
          <label 
            id="lyrics-editor-label" 
            htmlFor="lyrics-editor"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block shrink-0"
          >
            Edit Lyrics
          </label>
        
        <Textarea
          id="lyrics-editor"
          value={editedLyrics}
          onChange={handleChange}
          placeholder="Enter your lyrics here..."
          className={cn(
            "flex-1 min-h-[200px] h-full resize-none font-mono",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isError && "border-red-600 dark:border-red-500 focus-visible:ring-red-600 dark:focus-visible:ring-red-500",
            isWarning && "border-amber-600 dark:border-amber-500 focus-visible:ring-amber-600 dark:focus-visible:ring-amber-500"
          )}
          aria-label="Lyrics editor - edit your song lyrics"
          aria-describedby="char-counter lyrics-help lyrics-keyboard-hint"
          aria-invalid={isError}
          aria-required="true"
          spellCheck="true"
        />
        
        <div className="flex items-center justify-between shrink-0 mt-2">
          <p 
            id="lyrics-help" 
            className={cn(
              "text-xs",
              isError && "text-red-700 dark:text-red-400",
              isWarning && "text-amber-700 dark:text-amber-400",
              isTooShort && "text-amber-700 dark:text-amber-400",
              !isWarning && !isError && !isTooShort && "text-muted-foreground"
            )}
            role={isError ? 'alert' : undefined}
            aria-live={isError || isWarning ? 'assertive' : 'polite'}
          >
            {getHelpText()}
          </p>
          <span 
            id="char-counter"
            className={cn(
              "text-sm tabular-nums",
              isError && "text-red-700 dark:text-red-400 font-semibold",
              isWarning && "text-amber-700 dark:text-amber-400 font-semibold",
              !isWarning && !isError && "text-muted-foreground"
            )}
            aria-live="polite"
            aria-atomic="true"
            role="status"
          >
            <span className="sr-only">{getStatusMessage()}</span>
            <span aria-hidden="true">{charCount} / {MAX_CHARS}</span>
          </span>
        </div>
        
        <p 
          id="lyrics-keyboard-hint" 
          className="text-xs text-muted-foreground sr-only"
        >
          Use Ctrl+Z to undo and Ctrl+Y or Ctrl+Shift+Z to redo changes.
        </p>
        </div>
      </CardContent>
    </Card>
  )
}
