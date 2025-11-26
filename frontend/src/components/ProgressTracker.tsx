import * as React from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useLyricsEditingStore, type GenerationStatus } from '@/stores/lyricsEditingStore'
import { CheckCircle2, XCircle, Loader2, Clock, Wifi, WifiOff, RefreshCw, AlertTriangle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ErrorType, formatErrorForDisplay } from '@/lib/error-utils'

interface ProgressTrackerProps {
  isConnected: boolean
  connectionStatus?: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'
  reconnectAttempts?: number
  maxReconnectAttempts?: number
  onCancel?: () => void
  onRetry?: () => void
  onReconnect?: () => void
}

interface StatusConfig {
  icon: React.ReactNode
  label: string
  message: string
  color: string
}

// WCAG 2.1 AA compliant color classes (4.5:1 contrast ratio on white)
const STATUS_CONFIG: Record<GenerationStatus, StatusConfig> = {
  idle: {
    icon: <Clock className="h-5 w-5" />,
    label: 'Ready',
    message: 'Ready to generate your song',
    color: 'text-muted-foreground',
  },
  queued: {
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    label: 'Queued',
    message: 'Your song is in the queue...',
    color: 'text-blue-700 dark:text-blue-400',
  },
  processing: {
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    label: 'Processing',
    message: 'Generating your song...',
    color: 'text-blue-700 dark:text-blue-400',
  },
  completed: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    label: 'Completed',
    message: 'Song ready! Redirecting...',
    color: 'text-green-700 dark:text-green-400',
  },
  failed: {
    icon: <XCircle className="h-5 w-5" />,
    label: 'Failed',
    message: 'Generation failed. Please try again.',
    color: 'text-red-700 dark:text-red-400',
  },
}

/**
 * Get icon for error type
 */
const getErrorIcon = (errorType?: ErrorType) => {
  switch (errorType) {
    case ErrorType.TIMEOUT:
      return <Clock className="h-4 w-4" />
    case ErrorType.RATE_LIMIT:
      return <AlertTriangle className="h-4 w-4" />
    case ErrorType.INVALID_LYRICS:
      return <AlertCircle className="h-4 w-4" />
    case ErrorType.SERVER_ERROR:
    case ErrorType.NETWORK:
      return <WifiOff className="h-4 w-4" />
    default:
      return <XCircle className="h-4 w-4" />
  }
}

/**
 * Get alert variant based on error type
 */
const getAlertVariant = (errorType?: ErrorType): 'default' | 'destructive' => {
  switch (errorType) {
    case ErrorType.TIMEOUT:
    case ErrorType.RATE_LIMIT:
      return 'default' // Warning-style
    default:
      return 'destructive'
  }
}

/**
 * Get connection status display info
 */
const getConnectionStatusDisplay = (
  connectionStatus: ProgressTrackerProps['connectionStatus'],
  reconnectAttempts?: number,
  maxReconnectAttempts?: number
) => {
  switch (connectionStatus) {
    case 'connected':
      return {
        icon: <Wifi className="h-3 w-3" />,
        text: 'Connected',
        color: 'text-green-700 dark:text-green-400',
      }
    case 'connecting':
      return {
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        text: 'Connecting...',
        color: 'text-blue-700 dark:text-blue-400',
      }
    case 'reconnecting':
      return {
        icon: <RefreshCw className="h-3 w-3 animate-spin" />,
        text: reconnectAttempts && maxReconnectAttempts 
          ? `Reconnecting (${reconnectAttempts}/${maxReconnectAttempts})...`
          : 'Reconnecting...',
        color: 'text-amber-700 dark:text-amber-400',
      }
    case 'failed':
      return {
        icon: <WifiOff className="h-3 w-3" />,
        text: 'Connection failed',
        color: 'text-red-700 dark:text-red-400',
      }
    case 'disconnected':
    default:
      return {
        icon: <WifiOff className="h-3 w-3" />,
        text: 'Disconnected',
        color: 'text-muted-foreground',
      }
  }
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  isConnected,
  connectionStatus = isConnected ? 'connected' : 'disconnected',
  reconnectAttempts,
  maxReconnectAttempts,
  onCancel,
  onRetry,
  onReconnect,
}) => {
  const { generationStatus, progress, error, errorInfo, canRetry } = useLyricsEditingStore()
  
  const config = STATUS_CONFIG[generationStatus]
  const showProgress = generationStatus === 'queued' || generationStatus === 'processing'
  
  // Get formatted error display info
  const errorDisplay = errorInfo ? formatErrorForDisplay(errorInfo) : null
  
  // Get connection status display
  const connectionDisplay = getConnectionStatusDisplay(connectionStatus, reconnectAttempts, maxReconnectAttempts)
  
  // Generate unique IDs for ARIA attributes
  const statusId = 'progress-status'
  const progressId = 'progress-bar'
  const connectionId = 'connection-status'
  
  // Don't render if idle
  if (generationStatus === 'idle') {
    return null
  }
  
  return (
    <div 
      className="space-y-4 p-4 border rounded-lg bg-card"
      role="region"
      aria-labelledby={statusId}
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Header with status and connection indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn(config.color)} aria-hidden="true">
            {config.icon}
          </span>
          <div>
            <h3 
              id={statusId}
              className="font-semibold text-sm"
            >
              {config.label}
            </h3>
            <p 
              className="text-xs text-muted-foreground"
              aria-live="polite"
            >
              {config.message}
            </p>
          </div>
        </div>
        
        {/* WebSocket connection indicator */}
        <div className="flex items-center gap-2">
          <div 
            id={connectionId}
            className={cn('flex items-center gap-1 text-xs', connectionDisplay.color)}
            role="status"
            aria-label={`Connection status: ${connectionDisplay.text}`}
          >
            <span aria-hidden="true">{connectionDisplay.icon}</span>
            <span className="hidden sm:inline">{connectionDisplay.text}</span>
          </div>
          
          {/* Manual reconnect button when connection failed */}
          {connectionStatus === 'failed' && onReconnect && (
            <Button
              onClick={onReconnect}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Retry connection"
            >
              <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
              Retry
            </Button>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      {showProgress && (
        <div className="space-y-2">
          <Progress 
            id={progressId}
            value={progress} 
            className="h-2"
            aria-label={`Song generation progress: ${progress}% complete`}
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
          <p 
            className="text-xs text-center text-muted-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="sr-only">Progress: </span>
            {progress}% complete
          </p>
        </div>
      )}
      
      {/* Enhanced error display with Alert component */}
      {error && generationStatus === 'failed' && (
        <div className="space-y-3" role="alert" aria-live="assertive">
          <Alert variant={getAlertVariant(errorInfo?.type)}>
            <span className="mr-2" aria-hidden="true">{getErrorIcon(errorInfo?.type)}</span>
            <AlertTitle>{errorDisplay?.title || 'Error'}</AlertTitle>
            <AlertDescription>
              {errorDisplay?.description || error}
            </AlertDescription>
          </Alert>
          
          {/* Retry button for retryable errors */}
          {canRetry && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              size="sm"
              aria-label={errorDisplay?.retryLabel || 'Try again to generate song'}
            >
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              {errorDisplay?.retryLabel || 'Try Again'}
            </Button>
          )}
          
          {/* For non-retryable errors, show helpful message */}
          {!canRetry && errorInfo?.type === ErrorType.RATE_LIMIT && (
            <p className="text-xs text-center text-muted-foreground" role="note">
              Please wait for the rate limit to reset before trying again.
            </p>
          )}
          
          {!canRetry && errorInfo?.type === ErrorType.INVALID_LYRICS && (
            <p className="text-xs text-center text-muted-foreground" role="note">
              Please edit your lyrics and try again.
            </p>
          )}
        </div>
      )}
      
      {/* Cancel button (optional) */}
      {onCancel && showProgress && (
        <button
          onClick={onCancel}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none rounded-md py-1"
          aria-label="Cancel song generation"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
