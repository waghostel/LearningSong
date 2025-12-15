/**
 * Unit tests for error handling in lyrics regeneration
 * 
 * Feature: lyrics-regeneration-versioning, Task 12.2
 * Validates: Requirements 1.4, 7.2
 */

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosResponse, type AxiosRequestConfig } from 'axios'
import { useRegenerateLyrics } from '@/hooks/useRegenerateLyrics'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import * as lyricsApi from '@/api/lyrics'
import * as toastUtils from '@/lib/toast-utils'
import { ErrorType } from '@/lib/error-utils'

// Mock the API module
jest.mock('@/api/lyrics', () => ({
  regenerateLyrics: jest.fn(),
}))

// Mock toast utils
jest.mock('@/lib/toast-utils', () => ({
  showRateLimitError: jest.fn(),
  showNetworkError: jest.fn(),
  showError: jest.fn(),
  showSuccess: jest.fn(),
}))

// Create a test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Helper to create AxiosError
const createAxiosError = (status: number, message: string = 'Error', detail?: string, retryAfter?: number): AxiosError => {
  const error = new AxiosError(message)
  error.response = {
    status,
    data: { detail, retry_after: retryAfter },
    statusText: 'Error',
    headers: {},
    config: {} as AxiosRequestConfig,
  } as AxiosResponse
  return error
}

describe('useRegenerateLyrics Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    sessionStorage.clear()
    
    // Reset store
    const { result } = renderHook(() => useLyricsEditingStore())
    act(() => {
      result.current.reset()
    })
  })

  describe('Rate Limit Error (Requirements: 7.2)', () => {
    it('should show rate limit error toast when 429 status received', async () => {
      const rateLimitError = createAxiosError(429, 'Rate limit exceeded', 'Daily limit reached', 3600)
      ;(lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(rateLimitError)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      act(() => {
        result.current.regenerate({ content: 'test content', search_enabled: false })
      })

      await waitFor(() => {
        expect(toastUtils.showRateLimitError).toHaveBeenCalled()
      })
    })

    it('should set isRateLimited when rate limit error occurs', async () => {
      const rateLimitError = createAxiosError(429, 'Rate limit exceeded')
      ;(lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(rateLimitError)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      act(() => {
        result.current.regenerate({ content: 'test content', search_enabled: false })
      })

      await waitFor(() => {
        expect(result.current.isRateLimited).toBe(true)
      })
    })

    it('should not allow retry when rate limited', async () => {
      const rateLimitError = createAxiosError(429, 'Rate limit exceeded')
      ;(lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(rateLimitError)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      act(() => {
        result.current.regenerate({ content: 'test content', search_enabled: false })
      })

      await waitFor(() => {
        expect(result.current.canRetry).toBe(false)
      })
    })

    it('should calculate reset time from retry_after header', async () => {
      const retryAfterSeconds = 3600
      const rateLimitError = createAxiosError(429, 'Rate limit exceeded', 'Limit reached', retryAfterSeconds)
      ;(lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(rateLimitError)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      act(() => {
        result.current.regenerate({ content: 'test content', search_enabled: false })
      })

      await waitFor(() => {
        // Verify showRateLimitError was called with a Date
        expect(toastUtils.showRateLimitError).toHaveBeenCalledWith(expect.any(Date))
      })
    })
  })

  describe('Network Error Handling', () => {
    it('should show network error toast for network failures', async () => {
      const networkError = new AxiosError('Network Error')
      networkError.message = 'Network Error'
      ;(lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(networkError)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      act(() => {
        result.current.regenerate({ content: 'test content', search_enabled: false })
      })

      await waitFor(() => {
        expect(toastUtils.showNetworkError).toHaveBeenCalled()
      })
    })

    it('should allow retry for network errors', async () => {
      const networkError = new AxiosError('Network Error')
      networkError.message = 'Network Error'
      ;(lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(networkError)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      act(() => {
        result.current.regenerate({ content: 'test content', search_enabled: false })
      })

      await waitFor(() => {
        expect(result.current.canRetry).toBe(true)
      })
    })

    it('should handle timeout errors gracefully', async () => {
      const timeoutError = new AxiosError('timeout of 30000ms exceeded')
      timeoutError.message = 'timeout of 30000ms exceeded'
      ;(lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(timeoutError)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      act(() => {
        result.current.regenerate({ content: 'test content', search_enabled: false })
      })

      await waitFor(() => {
        expect(toastUtils.showNetworkError).toHaveBeenCalled()
        expect(result.current.canRetry).toBe(true)
      })
    })
  })

  describe('Server Error Handling', () => {
    it('should show error toast for 500 server errors', async () => {
      const serverError = createAxiosError(500, 'Internal Server Error')
      ;(lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(serverError)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      act(() => {
        result.current.regenerate({ content: 'test content', search_enabled: false })
      })

      await waitFor(() => {
        expect(toastUtils.showError).toHaveBeenCalled()
      })
    })

    it('should allow retry for server errors', async () => {
      const serverError = createAxiosError(500, 'Internal Server Error')
      ;(lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(serverError)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      act(() => {
        result.current.regenerate({ content: 'test content', search_enabled: false })
      })

      await waitFor(() => {
        expect(result.current.canRetry).toBe(true)
      })
    })
  })

  describe('Retry Functionality', () => {
    it('should retry regeneration when retry is called', async () => {
      // First call fails, second succeeds
      const serverError = createAxiosError(500, 'Temporary error')
      const successResponse = { lyrics: 'New lyrics', content_hash: 'hash', cached: false, processing_time: 1 }
      
      ;(lyricsApi.regenerateLyrics as jest.Mock)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce(successResponse)

      // Set up store with original content
      const storeHook = renderHook(() => useLyricsEditingStore())
      act(() => {
        storeHook.result.current.setOriginalContent('test content')
      })

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      // Initial failed call
      act(() => {
        result.current.regenerate({ content: 'test content', search_enabled: false })
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.canRetry).toBe(true)
      })

      // Retry
      act(() => {
        result.current.retry()
      })

      await waitFor(() => {
        expect(lyricsApi.regenerateLyrics).toHaveBeenCalledTimes(2)
      })
    })

    it('should show error when retry called without original content', async () => {
      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      // Try to retry without any original content set
      act(() => {
        result.current.retry()
      })

      await waitFor(() => {
        expect(toastUtils.showError).toHaveBeenCalledWith('Cannot Retry', 'No content available for regeneration')
      })
    })
  })

  describe('Error Type Detection', () => {
    it('should correctly identify rate limit errors', async () => {
      const rateLimitError = createAxiosError(429)
      ;(lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(rateLimitError)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      act(() => {
        result.current.regenerate({ content: 'test', search_enabled: false })
      })

      await waitFor(() => {
        expect(result.current.getErrorType()).toBe(ErrorType.RATE_LIMIT)
      })
    })

    it('should correctly identify server errors', async () => {
      const serverError = createAxiosError(500)
      ;(lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(serverError)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      act(() => {
        result.current.regenerate({ content: 'test', search_enabled: false })
      })

      await waitFor(() => {
        expect(result.current.getErrorType()).toBe(ErrorType.SERVER_ERROR)
      })
    })

    it('should correctly identify invalid lyrics errors', async () => {
      const validationError = createAxiosError(400, 'Bad Request', 'Lyrics contain prohibited content')
      ;(lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(validationError)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      act(() => {
        result.current.regenerate({ content: 'test', search_enabled: false })
      })

      await waitFor(() => {
        expect(result.current.getErrorType()).toBe(ErrorType.INVALID_LYRICS)
      })
    })
  })

  describe('Console Logging', () => {
    let consoleErrorSpy: jest.SpyInstance
    let consoleLogSpy: jest.SpyInstance

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
      consoleLogSpy.mockRestore()
    })

    it('should log errors to console for debugging', async () => {
      const serverError = createAxiosError(500, 'Internal Server Error')
      ;(lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(serverError)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      act(() => {
        result.current.regenerate({ content: 'test content', search_enabled: false })
      })

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('[Regeneration Error]', expect.any(Error))
        expect(consoleErrorSpy).toHaveBeenCalledWith('[Regeneration Error Details]', expect.any(Object))
      })
    })


  })

  describe('Store Error State Updates', () => {
    it('should update store with error message on failure', async () => {
      const serverError = createAxiosError(500, 'Server error')
      ;(lyricsApi.regenerateLyrics as jest.Mock).mockRejectedValue(serverError)

      const storeHook = renderHook(() => useLyricsEditingStore())
      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      act(() => {
        result.current.regenerate({ content: 'test content', search_enabled: false })
      })

      await waitFor(() => {
        expect(storeHook.result.current.regenerationError).toBeTruthy()
        expect(storeHook.result.current.isRegenerating).toBe(false)
      })
    })

    it('should clear error state on successful regeneration', async () => {
      // First fail, then succeed
      const serverError = createAxiosError(500, 'Temporary error')
      const successResponse = { lyrics: 'New lyrics', content_hash: 'hash', cached: false, processing_time: 1 }
      
      ;(lyricsApi.regenerateLyrics as jest.Mock)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce(successResponse)

      const storeHook = renderHook(() => useLyricsEditingStore())
      act(() => {
        storeHook.result.current.setOriginalContent('test content')
      })

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      // First call fails
      act(() => {
        result.current.regenerate({ content: 'test content', search_enabled: false })
      })

      await waitFor(() => {
        expect(storeHook.result.current.regenerationError).toBeTruthy()
      })

      // Second call succeeds
      act(() => {
        result.current.regenerate({ content: 'test content', search_enabled: false })
      })

      await waitFor(() => {
        expect(storeHook.result.current.regenerationError).toBeNull()
        expect(storeHook.result.current.isRegenerating).toBe(false)
      })
    })
  })
})
