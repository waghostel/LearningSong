import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { regenerateLyrics, type RegenerateLyricsRequest, type GenerateLyricsResponse } from '@/api/lyrics'
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
 * - Tracks variation counter for context-aware regeneration (Phase 2)
 * - Passes previous lyrics to avoid repeating patterns (Phase 2)
 */
export const useRegenerateLyrics = () => {
  const { 
    completeRegeneration, 
    failRegeneration, 
    startRegeneration,
    originalContent,
    versions,
  } = useLyricsEditingStore()

  const mutation = useMutation<GenerateLyricsResponse, Error, RegenerateLyricsRequest>({
    mutationFn: regenerateLyrics,
    onMutate: () => {
      startRegeneration()
    },
    onSuccess: (data) => {
      completeRegeneration(data.lyrics)
      showSuccess('Lyrics regenerated successfully!')
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
              },
            })
            break
          
          default:
            showError('Regeneration Failed', errorMessage)
        }
      } else if (error instanceof Error) {
        if (error.message && error.message.trim() !== '') {
          errorMessage = error.message
        }
        errorType = classifyError(undefined, errorMessage)
        showError('Regeneration Failed', errorMessage)
      } else {
        showError('Regeneration Failed', 'An unexpected error occurred')
      }
      
      // Update store with error state (Requirements: 1.4)
      failRegeneration(errorMessage)
    },
  })

  /**
   * Get the previous lyrics to pass to the backend
   * Uses the most recent version's lyrics (or edited version if available)
   */
  const getPreviousLyrics = (): string => {
    if (versions.length === 0) return ''
    
    // Get the most recent version
    const lastVersion = versions[versions.length - 1]
    
    // Return edited lyrics if available, otherwise original lyrics
    return lastVersion.editedLyrics || lastVersion.lyrics
  }

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
    
    // Calculate variation counter (number of versions + 1)
    const variationCounter = versions.length + 1
    const previousLyrics = getPreviousLyrics()
    
    mutation.mutate({
      content: originalContent,
      search_enabled: false,
      variation_counter: variationCounter,
      previous_lyrics: previousLyrics,
    })
  }

  /**
   * Regenerate lyrics with the given content
   * Automatically calculates variation counter and includes previous lyrics
   */
  const regenerate = (request: RegenerateLyricsRequest) => {
    // Calculate variation counter based on number of existing versions
    const variationCounter = request.variation_counter || (versions.length + 1)
    
    // Get previous lyrics if not provided
    const previousLyrics = request.previous_lyrics || getPreviousLyrics()
    
    mutation.mutate({
      ...request,
      variation_counter: variationCounter,
      previous_lyrics: previousLyrics,
    })
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
