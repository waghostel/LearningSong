import * as React from 'react'
import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import { useRegenerateLyrics } from '@/hooks/useRegenerateLyrics'
import { VersionSelector } from '@/components/VersionSelector'
import { RegenerationError } from '@/components/RegenerationError'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

const MAX_CHARS = 3000
const WARNING_THRESHOLD = 2700
const MIN_CHARS = 50

export const LyricsEditor: React.FC = () => {
  const { 
    editedLyrics, 
    setEditedLyrics, 
    activeVersionId, 
    updateVersionEdits,
    versions,
    setActiveVersion,
    deleteVersion,
    isRegenerating,
    regenerationError,
  } = useLyricsEditingStore()
  
  // Get retry functionality from regeneration hook (Requirements: 1.4)
  const { retry, canRetry, getErrorType, isRegenerating: isRetrying } = useRegenerateLyrics()
  
  // State for delete confirmation dialog (Requirements: 6.5)
  const [versionToDelete, setVersionToDelete] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Force re-render when active version changes to fix rendering bug
  // The key prop on the Textarea ensures it re-renders with new lyrics
  
  const charCount = editedLyrics.length
  const isWarning = charCount >= WARNING_THRESHOLD && charCount <= MAX_CHARS
  const isError = charCount > MAX_CHARS
  const isTooShort = charCount > 0 && charCount < MIN_CHARS
  
  // Handle textarea change with edit tracking (Requirements: 5.1, 5.3)
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setEditedLyrics(newValue)
    
    // Track edits to the active version if there is one
    if (activeVersionId) {
      updateVersionEdits(activeVersionId, newValue)
    }
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
  
  // Handle version selection (Requirements: 2.2, 2.4)
  const handleVersionSelect = (versionId: string) => {
    setActiveVersion(versionId)
  }

  // Handle version deletion request - show confirmation dialog (Requirements: 6.5)
  const handleVersionDeleteRequest = (versionId: string) => {
    setVersionToDelete(versionId)
    setShowDeleteConfirm(true)
  }

  // Confirm version deletion (Requirements: 6.1, 6.2, 6.3)
  const handleConfirmDelete = () => {
    if (versionToDelete) {
      deleteVersion(versionToDelete)
    }
    setShowDeleteConfirm(false)
    setVersionToDelete(null)
  }

  // Cancel version deletion
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setVersionToDelete(null)
  }
  
  return (
    <>
    <Card className="flex-1 flex flex-col min-h-0">
      <CardContent className="p-4 flex-1 flex flex-col min-h-0 gap-2">
        {/* Version Selector positioned above lyrics textarea (Requirements: 6.4) */}
        <VersionSelector
          versions={versions}
          activeVersionId={activeVersionId}
          onVersionSelect={handleVersionSelect}
          onVersionDelete={handleVersionDeleteRequest}
          disabled={isRegenerating}
        />
        
        {/* Regeneration Error Display (Requirements: 1.4, 7.2) */}
        <RegenerationError
          errorMessage={regenerationError}
          errorType={getErrorType()}
          canRetry={canRetry}
          onRetry={retry}
          isRetrying={isRetrying}
        />
        
        <div role="group" aria-labelledby="lyrics-editor-label" className="flex-1 flex flex-col min-h-0">
          <label 
            id="lyrics-editor-label" 
            htmlFor="lyrics-editor"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block shrink-0"
          >
            Edit Lyrics
          </label>
        
        <Textarea
          key={`lyrics-editor-${activeVersionId}`}
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
    
    {/* Delete confirmation dialog (Requirements: 6.5) */}
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Version</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this version? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
