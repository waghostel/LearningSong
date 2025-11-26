import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { generateSong, type GenerateSongRequest, type SongStatusUpdate } from '@/api/songs'
import { ApiError } from '@/api/client'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import { useWebSocket } from './useWebSocket'
import type { ErrorInfo } from '@/lib/error-utils'

interface UseSongGenerationOptions {
  onSuccess?: (songUrl: string) => void
  onError?: (error: string, retryable: boolean, errorInfo?: ErrorInfo) => void
}

interface UseSongGenerationReturn {
  generate: (request: GenerateSongRequest) => void
  retry: () => void
  isGenerating: boolean
  isConnected: boolean
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'
  reconnectAttempts: number
  maxReconnectAttempts: number
  manualReconnect: () => void
  error: string | null
  errorInfo: ErrorInfo | null
  canRetry: boolean
  progress: number
  status: string
}

/**
 * Custom hook for song generation that combines TanStack Query mutation with WebSocket updates
 * 
 * Workflow:
 * 1. Initiate song generation via API (POST /api/songs/generate)
 * 2. Receive task_id from API response
 * 3. Establish WebSocket connection for real-time updates
 * 4. Monitor generation progress via WebSocket
 * 5. Update Zustand store with status changes
 * 6. Complete when song is ready or handle errors
 * 
 * @param options - Configuration options
 * @returns Generation state and control functions
 */
export const useSongGeneration = ({
  onSuccess,
  onError,
}: UseSongGenerationOptions = {}): UseSongGenerationReturn => {
  // Get Zustand store state and actions
  const {
    isGenerating,
    taskId,
    generationStatus,
    progress,
    error: storeError,
    errorInfo: storeErrorInfo,
    canRetry: storeCanRetry,
    lastRequest,
    startGeneration,
    updateProgress,
    completeGeneration,
    failGeneration,
  } = useLyricsEditingStore()

  /**
   * Handle status updates from WebSocket
   */
  const handleStatusUpdate = useCallback((update: SongStatusUpdate) => {
    // Update progress in store
    updateProgress(update.status, update.progress)
  }, [updateProgress])

  /**
   * Handle generation completion
   */
  const handleComplete = useCallback((songUrl: string) => {
    // Update store
    completeGeneration(songUrl)
    
    // Call success callback
    onSuccess?.(songUrl)
  }, [completeGeneration, onSuccess])

  /**
   * Handle generation error from WebSocket
   */
  const handleWSError = useCallback((error: string) => {
    console.error('Song generation error:', error)
    
    // Update store with error (not retryable from WebSocket)
    failGeneration(error, false)
    
    // Call error callback
    onError?.(error, false)
  }, [failGeneration, onError])

  // Setup WebSocket connection when taskId is available
  const { 
    isConnected, 
    connectionStatus,
    error: wsError,
    reconnectAttempts,
    maxReconnectAttempts,
    manualReconnect,
  } = useWebSocket({
    taskId,
    onStatusUpdate: handleStatusUpdate,
    onComplete: handleComplete,
    onError: handleWSError,
  })

  /**
   * TanStack Query mutation for initiating song generation
   */
  const mutation = useMutation({
    mutationFn: generateSong,
    onSuccess: (response) => {
      // Store task_id and start monitoring
      startGeneration(response.task_id)
    },
    onError: (error: Error) => {
      console.error('Failed to initiate song generation:', error)
      
      // Get enhanced error info from ApiError
      let errorMessage: string
      let isRetryable: boolean
      let errorInfo: ErrorInfo | undefined

      if (error instanceof ApiError) {
        errorMessage = error.userMessage
        isRetryable = error.retryable
        errorInfo = error.errorInfo

        // Log specific error types for debugging
        if (error.isTimeout) {
          console.warn('Song generation timeout - server may still be processing')
        } else if (error.isRateLimit) {
          console.warn('Rate limit reached')
        } else if (error.isServerError) {
          console.warn('Server error - will retry')
        } else if (error.isInvalidLyrics) {
          console.warn('Invalid lyrics submitted')
        }
      } else {
        errorMessage = error.message || 'Failed to start song generation'
        isRetryable = true
      }
      
      // Update store with error and error info
      failGeneration(errorMessage, isRetryable, errorInfo)
      
      // Call error callback with enhanced info
      onError?.(errorMessage, isRetryable, errorInfo)
    },
  })

  /**
   * Generate song function
   */
  const generate = useCallback((request: GenerateSongRequest) => {
    // Validate request
    if (!request.lyrics || request.lyrics.trim().length === 0) {
      const error = 'Lyrics cannot be empty'
      failGeneration(error, false)
      onError?.(error, false)
      return
    }

    if (request.lyrics.length > 3000) {
      const error = 'Lyrics exceed maximum length of 3000 characters'
      failGeneration(error, false)
      onError?.(error, false)
      return
    }

    // Initiate generation
    mutation.mutate(request)
  }, [mutation, failGeneration, onError])

  /**
   * Retry last failed generation
   */
  const retry = useCallback(() => {
    if (lastRequest && storeCanRetry) {
      generate(lastRequest)
    }
  }, [lastRequest, storeCanRetry, generate])

  // Handle WebSocket errors
  useEffect(() => {
    if (wsError && isGenerating) {
      console.error('WebSocket error during generation:', wsError)
      // Don't fail the generation immediately, as we can still poll
      // Just log the error for now
    }
  }, [wsError, isGenerating])

  return {
    generate,
    retry,
    isGenerating,
    isConnected,
    connectionStatus,
    reconnectAttempts,
    maxReconnectAttempts,
    manualReconnect,
    error: storeError || wsError || (mutation.error?.message ?? null),
    errorInfo: storeErrorInfo || null,
    canRetry: storeCanRetry,
    progress,
    status: generationStatus,
  }
}
