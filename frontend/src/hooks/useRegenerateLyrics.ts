import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { regenerateLyrics, type GenerateLyricsRequest, type GenerateLyricsResponse } from '@/api/lyrics'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import { 
  showRateLimitError, 
  showNetworkError, 
  showError, 
  showSuccess 
} from '@/lib/toast-utils'
import { classifyError, ErrorType, getErrorInfo } from '@/lib/error-utils'

/**
 * Custom hook for lyrics regeneration with enhanced error handling
 * 
 * Features:
 * - Displays toast notifications for regeneration errors (Requirements: 1.4)
 * - Shows specific error messages for rate limit exceeded (Requirements: 7.2)
 * - Handles network timeouts gracefully
 * - Logs errors to console for debugging
 * - Provides retry functionality on failure
 */
export const useRegenerateLyrics = () => {
  const { 
    completeRegeneration, 
    failRegeneration, 
    startRegeneration,
    originalContent,
  } = useLyricsEditingStore()

  const mutation = useMutation<GenerateLyricsResponse, Error, GenerateLyricsRequest>({
    mutationFn: regenerateLyrics,
    onMutate: () => {
      startRegeneration()
    },
    onSuccess: (data) => {
      completeRegeneration(data.lyrics)
      showSuccess('Lyrics regenerated successfully!')
      // console.log('[Regeneration] Successfully created new lyrics version')
    },
    onError: (error) => {
      // Log error to console for debugging (Requirements: 1.4)
      console.error('[Regeneration Error]', error)
      
      // Parse error for specific handling
      let errorMessage = 'Failed to regenerate lyrics'
      let errorType: ErrorType = ErrorType.UNKNOWN
      
      if (error instanceof AxiosError) {
        const statusCode = error.response?.status
        const serverDetail = error.response?.data?.detail
        
        // Classify error type
        errorType = classifyError(statusCode, error.message)
        const errorInfo = getErrorInfo(statusCode, error.message, serverDetail)
        errorMessage = errorInfo.userMessage
        
        // Log detailed error info for debugging
        console.error('[Regeneration Error Details]', {
          statusCode,
          errorType,
          serverDetail,
          message: error.message,
        })
        
        // Show appropriate toast based on error type (Requirements: 7.2)
        switch (errorType) {
          case ErrorType.RATE_LIMIT: {
            // Parse retry_after if available from response
            const retryAfter = error.response?.data?.retry_after
            const resetTime = retryAfter 
              ? new Date(Date.now() + retryAfter * 1000)
              : undefined
            showRateLimitError(resetTime)
            break
          }
          
          case ErrorType.TIMEOUT:
          case ErrorType.NETWORK:
            showNetworkError(error, {
              onRetry: () => {
                // Will be handled via the retry function
                // console.log('[Regeneration] User initiated retry from toast')
              },
            })
            break
          
          default:
            showError('Regeneration Failed', errorMessage)
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
        errorType = classifyError(undefined, error.message)
        showError('Regeneration Failed', errorMessage)
      } else {
        showError('Regeneration Failed', 'An unexpected error occurred')
      }
      
      // Update store with error state (Requirements: 1.4)
      failRegeneration(errorMessage)
    },
  })

  /**
   * Retry the last regeneration request
   * Useful for network errors or transient failures
   */
  const retry = () => {
    if (!originalContent) {
      console.warn('[Regeneration] Cannot retry: no original content available')
      showError('Cannot Retry', 'No content available for regeneration')
      return
    }
    
    // console.log('[Regeneration] Retrying regeneration...')
    mutation.mutate({
      content: originalContent,
      search_enabled: false,
    })
  }

  /**
   * Regenerate lyrics with the given content
   */
  const regenerate = (request: GenerateLyricsRequest) => {
    // console.log('[Regeneration] Starting regeneration with content hash:', contentHash)
    mutation.mutate(request)
  }

  // Determine if retry is available based on error type
  const canRetry = mutation.error !== null && (() => {
    if (mutation.error instanceof AxiosError) {
      const errorType = classifyError(
        mutation.error.response?.status, 
        mutation.error.message
      )
      // Can retry for network, timeout, and server errors
      return [ErrorType.NETWORK, ErrorType.TIMEOUT, ErrorType.SERVER_ERROR].includes(errorType)
    }
    return true // Default to allowing retry for unknown errors
  })()

  // Get the error type for external callers
  const getErrorType = (): ErrorType | null => {
    if (!mutation.error) return null
    if (mutation.error instanceof AxiosError) {
      return classifyError(mutation.error.response?.status, mutation.error.message)
    }
    return ErrorType.UNKNOWN
  }

  return {
    regenerate,
    retry,
    isRegenerating: mutation.isPending,
    error: mutation.error,
    canRetry,
    getErrorType,
    isRateLimited: getErrorType() === ErrorType.RATE_LIMIT,
  }
}
