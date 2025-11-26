import * as React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { WifiOff, RefreshCw, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OfflineIndicatorProps {
  isOnline: boolean
  wasOffline?: boolean
  onRetry?: () => void
  className?: string
}

/**
 * Component to display offline status and provide retry functionality
 * 
 * Features:
 * - Shows offline banner when network is unavailable
 * - Shows "back online" message when connection is restored
 * - Provides manual retry button
 * - Accessible with proper ARIA attributes
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnline,
  wasOffline = false,
  onRetry,
  className,
}) => {
  const [showBackOnline, setShowBackOnline] = React.useState(false)
  const [isRetrying, setIsRetrying] = React.useState(false)

  // Show "back online" message when connection is restored
  React.useEffect(() => {
    if (isOnline && wasOffline) {
      setShowBackOnline(true)
      const timer = setTimeout(() => {
        setShowBackOnline(false)
      }, 3000) // Hide after 3 seconds
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  /**
   * Handle retry button click
   */
  const handleRetry = async () => {
    if (!onRetry) return
    
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  // Show "back online" notification
  if (isOnline && showBackOnline) {
    return (
      <div
        className={cn(
          'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4',
          className
        )}
        role="status"
        aria-live="polite"
      >
        <Alert className="bg-green-50 border-green-200 shadow-lg">
          <Wifi className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Back Online</AlertTitle>
          <AlertDescription className="text-green-700">
            Your internet connection has been restored.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Don't show anything if online
  if (isOnline) {
    return null
  }

  // Show offline indicator
  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4',
        className
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <Alert variant="destructive" className="shadow-lg">
        <WifiOff className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>You're Offline</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>Please check your internet connection.</span>
          {onRetry && (
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
              disabled={isRetrying}
              className="shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={isRetrying ? 'Checking connection...' : 'Retry connection'}
              aria-busy={isRetrying}
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" aria-hidden="true" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
                  Retry
                </>
              )}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}
