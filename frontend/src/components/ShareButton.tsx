import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Share2, Check } from 'lucide-react'
import { useSongPlaybackStore } from '@/stores/songPlaybackStore'
import { showSuccess, showError } from '@/lib/toast-utils'
import { logShareLinkCreated } from '@/lib/analytics'
import { cn } from '@/lib/utils'

interface ShareButtonProps {
  songId: string
  onShareSuccess?: (shareUrl: string) => void
  onShareError?: (error: Error) => void
  className?: string
  disabled?: boolean
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  songId,
  onShareSuccess,
  onShareError,
  className,
  disabled = false,
}) => {
  const { createShareLink, isSharing, primaryVariationIndex } = useSongPlaybackStore()
  const [showCopied, setShowCopied] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  const handleShare = async () => {
    if (!songId || isSharing) return

    try {
      const shareUrl = await createShareLink()
      
      // Log analytics event
      // Property 28: Share link uses primary variation
      // Requirements: 10.4
      logShareLinkCreated(songId, primaryVariationIndex)
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl)
      
      // Show success state
      setShowCopied(true)
      showSuccess('Link copied!', 'Share link has been copied to clipboard')
      
      // Reset copied state after 2 seconds
      setTimeout(() => setShowCopied(false), 2000)
      
      // Call success callback
      onShareSuccess?.(shareUrl)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create share link')
      
      // Show user-friendly error message
      showError('Share failed', 'Unable to create share link. Please try again.')
      
      // Call error callback
      onShareError?.(error)
    }
  }

  const isDisabled = disabled || isSharing || !songId

  return (
    <Button
      ref={buttonRef}
      onClick={handleShare}
      disabled={isDisabled}
      variant="outline"
      className={cn(
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      title={isDisabled ? 'Share not available' : 'Share this song'}
      aria-label={
        isSharing
          ? 'Creating share link, please wait'
          : showCopied
            ? 'Link copied to clipboard'
            : 'Share this song'
      }
      aria-busy={isSharing}
    >
      {isSharing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Sharing...</span>
        </>
      ) : showCopied ? (
        <>
          <Check className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>Share</span>
        </>
      )}
    </Button>
  )
}
