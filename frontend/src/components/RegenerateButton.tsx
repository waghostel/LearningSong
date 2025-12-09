import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
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

/**
 * Props for the RegenerateButton component
 * Requirements: 1.2, 1.5, 7.2
 */
export interface RegenerateButtonProps {
  /** Callback function when regeneration is triggered */
  onRegenerate: () => void
  /** Whether a regeneration is currently in progress */
  isRegenerating: boolean
  /** Whether the user has unsaved edits that would be lost */
  hasUnsavedEdits: boolean
  /** Whether the rate limit has been reached */
  isRateLimited?: boolean
  /** Whether the user is offline */
  isOffline?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * RegenerateButton component for lyrics regeneration
 * 
 * Features:
 * - Shows loading spinner when regenerating
 * - Disabled when regenerating or rate limit reached
 * - Shows confirmation dialog if user has unsaved edits
 * - Keyboard shortcut: Ctrl+R for regeneration
 * 
 * Requirements: 1.2, 1.5, 7.2
 */
export const RegenerateButton: React.FC<RegenerateButtonProps> = ({
  onRegenerate,
  isRegenerating,
  hasUnsavedEdits,
  isRateLimited = false,
  isOffline = false,
  className,
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  const isDisabled = isRegenerating || isRateLimited || isOffline

  // Get disabled reason for tooltip and accessibility
  const getDisabledReason = () => {
    if (isOffline) return 'You are offline. Please check your internet connection.'
    if (isRateLimited) return 'Daily regeneration limit reached. Try again tomorrow.'
    if (isRegenerating) return 'Regeneration in progress...'
    return ''
  }

  const disabledReason = getDisabledReason()

  const handleClick = React.useCallback(() => {
    if (isDisabled) return

    if (hasUnsavedEdits) {
      setShowConfirmDialog(true)
    } else {
      onRegenerate()
    }
  }, [isDisabled, hasUnsavedEdits, onRegenerate])

  // Handle confirmation dialog
  const handleConfirm = () => {
    setShowConfirmDialog(false)
    onRegenerate()
  }

  const handleCancel = () => {
    setShowConfirmDialog(false)
    buttonRef.current?.focus()
  }

  // Handle keyboard shortcut (Ctrl+R)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault()
        if (!isDisabled) {
          handleClick()
          buttonRef.current?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDisabled, handleClick])

  // Generate unique IDs for ARIA attributes
  const buttonId = 'regenerate-button'
  const descriptionId = 'regenerate-button-description'

  return (
    <>
      <div className="space-y-2" role="group" aria-labelledby={buttonId}>
        <Button
          ref={buttonRef}
          id={buttonId}
          onClick={handleClick}
          disabled={isDisabled}
          variant="outline"
          className={cn(
            'w-full',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            className
          )}
          size="lg"
          title={disabledReason || 'Regenerate lyrics with AI'}
          aria-label={
            isRegenerating
              ? 'Regenerating lyrics, please wait'
              : `Regenerate lyrics${isDisabled ? ` (disabled: ${disabledReason})` : ''}`
          }
          aria-describedby={descriptionId}
          aria-busy={isRegenerating}
          aria-disabled={isDisabled}
        >
          {isRegenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Regenerating...</span>
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Regenerate Lyrics</span>
            </>
          )}
        </Button>

        <p
          id={descriptionId}
          className="text-xs text-center text-muted-foreground"
          aria-live="polite"
        >
          {!isRegenerating && (
            disabledReason || 'Press Ctrl+R to regenerate'
          )}
          {isRegenerating && 'Creating new lyrics version...'}
        </p>
      </div>

      {/* Confirmation Dialog for Unsaved Edits - Requirements: 1.5 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits to your lyrics. Regenerating will create a new version,
              but your current edits will be saved to the current version. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
