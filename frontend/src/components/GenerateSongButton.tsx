import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Music } from 'lucide-react'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import { cn } from '@/lib/utils'

interface GenerateSongButtonProps {
  onClick: () => void
  isRateLimited?: boolean
  isOffline?: boolean
  className?: string
}

const MAX_CHARS = 3000
const ESTIMATED_TIME = '30-60 seconds'

export const GenerateSongButton: React.FC<GenerateSongButtonProps> = ({
  onClick,
  isRateLimited = false,
  isOffline = false,
  className,
}) => {
  const { editedLyrics, isGenerating } = useLyricsEditingStore()
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  
  const isEmpty = !editedLyrics || editedLyrics.trim().length === 0
  const isTooLong = editedLyrics.length > MAX_CHARS
  const isDisabled = isEmpty || isTooLong || isRateLimited || isGenerating || isOffline
  
  // Get disabled reason for tooltip and accessibility
  const getDisabledReason = () => {
    if (isOffline) return 'You are offline. Please check your internet connection.'
    if (isEmpty) return 'Please enter lyrics to generate a song'
    if (isTooLong) return `Lyrics exceed maximum length of ${MAX_CHARS} characters`
    if (isRateLimited) return 'Rate limit reached. Please try again later'
    if (isGenerating) return 'Song generation in progress...'
    return ''
  }
  
  const disabledReason = getDisabledReason()
  
  // Handle keyboard shortcut (Ctrl+Enter)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!isDisabled) {
          onClick()
          // Announce action to screen readers
          buttonRef.current?.focus()
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDisabled, onClick])
  
  // Generate unique IDs for ARIA attributes
  const buttonId = 'generate-song-button'
  const descriptionId = 'generate-song-description'
  
  return (
    <div className="space-y-2 flex flex-col items-end" role="group" aria-labelledby={buttonId}>
      <Button
        ref={buttonRef}
        id={buttonId}
        onClick={onClick}
        disabled={isDisabled}
        className={cn(
          'w-full',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}
        size="lg"
        title={disabledReason || `Generate song (estimated time: ${ESTIMATED_TIME})`}
        aria-label={
          isGenerating 
            ? 'Generating song, please wait' 
            : `Generate song from lyrics${isDisabled ? ` (disabled: ${disabledReason})` : ''}`
        }
        aria-describedby={descriptionId}
        aria-busy={isGenerating}
        aria-disabled={isDisabled}
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Generating Song...</span>
          </>
        ) : (
          <>
            <Music className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Generate Song</span>
          </>
        )}
      </Button>
      
      <p 
        id={descriptionId}
        className="text-xs text-right text-muted-foreground"
        aria-live="polite"
      >
        {!isGenerating && (
          disabledReason || `Estimated time: ${ESTIMATED_TIME} • Press Ctrl+Enter to generate`
        )}
        {isGenerating && 'Song generation in progress. You will be notified when complete.'}
      </p>
    </div>
  )
}
