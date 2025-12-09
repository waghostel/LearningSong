import * as React from 'react'
import { AlertCircle, RefreshCw, Clock, WifiOff, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { ErrorType } from '@/lib/error-utils'

/**
 * Props for the RegenerationError component
 * Requirements: 1.4, 7.2
 */
export interface RegenerationErrorProps {
  /** The error message to display */
  errorMessage: string | null
  /** The type of error */
  errorType: ErrorType | null
  /** Whether a retry is allowed */
  canRetry: boolean
  /** Callback for retry button click */
  onRetry?: () => void
  /** Whether a retry is in progress */
  isRetrying?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Get the appropriate icon for the error type
 */
const getErrorIcon = (errorType: ErrorType | null): React.ReactNode => {
  switch (errorType) {
    case ErrorType.RATE_LIMIT:
      return <Clock className="h-4 w-4" aria-hidden="true" />
    case ErrorType.NETWORK:
      return <WifiOff className="h-4 w-4" aria-hidden="true" />
    case ErrorType.TIMEOUT:
      return <Clock className="h-4 w-4" aria-hidden="true" />
    case ErrorType.INVALID_LYRICS:
      return <Ban className="h-4 w-4" aria-hidden="true" />
    default:
      return <AlertCircle className="h-4 w-4" aria-hidden="true" />
  }
}

/**
 * Get the title for the error type
 */
const getErrorTitle = (errorType: ErrorType | null): string => {
  switch (errorType) {
    case ErrorType.RATE_LIMIT:
      return 'Rate Limit Reached'
    case ErrorType.NETWORK:
      return 'Network Error'
    case ErrorType.TIMEOUT:
      return 'Request Timeout'
    case ErrorType.INVALID_LYRICS:
      return 'Invalid Request'
    case ErrorType.SERVER_ERROR:
      return 'Server Error'
    case ErrorType.AUTH:
      return 'Authentication Error'
    default:
      return 'Regeneration Failed'
  }
}

/**
 * Get the retry button text for the error type
 */
const getRetryButtonText = (errorType: ErrorType | null): string => {
  switch (errorType) {
    case ErrorType.NETWORK:
      return 'Retry Connection'
    case ErrorType.TIMEOUT:
      return 'Try Again'
    default:
      return 'Retry'
  }
}

/**
 * RegenerationError component
 * 
 * Displays error messages for regeneration failures with appropriate styling
 * and a retry button when applicable.
 * 
 * Requirements:
 * - 1.4: WHEN regeneration fails THEN the System SHALL display an error message
 * - 7.2: WHEN the regeneration limit is reached THEN the System SHALL display an error message
 */
export const RegenerationError: React.FC<RegenerationErrorProps> = ({
  errorMessage,
  errorType,
  canRetry,
  onRetry,
  isRetrying = false,
  className,
}) => {
  // Don't render if there's no error
  if (!errorMessage) {
    return null
  }

  const icon = getErrorIcon(errorType)
  const title = getErrorTitle(errorType)
  const retryText = getRetryButtonText(errorType)

  // Determine alert variant based on error type
  const isWarning = errorType === ErrorType.RATE_LIMIT
  const variant = isWarning ? 'default' : 'destructive'

  return (
    <Alert 
      variant={variant} 
      className={cn('mb-4', className)}
      role="alert"
      aria-live="assertive"
    >
      {icon}
      <AlertTitle className="flex items-center gap-2">
        {title}
      </AlertTitle>
      <AlertDescription className="mt-2 flex flex-col gap-3">
        <p>{errorMessage}</p>
        
        {/* Retry button - only show if retry is allowed */}
        {canRetry && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="w-fit"
            aria-label={isRetrying ? 'Retrying regeneration...' : retryText}
          >
            <RefreshCw 
              className={cn(
                'mr-2 h-4 w-4',
                isRetrying && 'animate-spin'
              )} 
              aria-hidden="true" 
            />
            {isRetrying ? 'Retrying...' : retryText}
          </Button>
        )}
        
        {/* Additional info for rate limit errors */}
        {errorType === ErrorType.RATE_LIMIT && (
          <p className="text-xs text-muted-foreground">
            The limit will reset automatically. Please check back later.
          </p>
        )}
      </AlertDescription>
    </Alert>
  )
}
