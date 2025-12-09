import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRegenerateLyrics } from '@/hooks/useRegenerateLyrics'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import * as lyricsApi from '@/api/lyrics'
import * as toastUtils from '@/lib/toast-utils'
import React, { ReactNode } from 'react'

// Mock dependencies
jest.mock('@/api/lyrics')
jest.mock('@/lib/toast-utils')

const mockRegenerateLyrics = lyricsApi.regenerateLyrics as jest.MockedFunction<typeof lyricsApi.regenerateLyrics>
const mockShowSuccess = toastUtils.showSuccess as jest.MockedFunction<typeof toastUtils.showSuccess>
const mockShowError = toastUtils.showError as jest.MockedFunction<typeof toastUtils.showError>

describe('useRegenerateLyrics', () => {
  let queryClient: QueryClient

  const createWrapper = () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    return ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children)
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    jest.clearAllMocks()
    useLyricsEditingStore.getState().reset()
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('successful regeneration', () => {
    it('should call startRegeneration on mutation start', async () => {
      let resolvePromise: (value: unknown) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockRegenerateLyrics.mockReturnValue(promise as Promise<never>)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      result.current.regenerate({
        content: 'Test content',
        search_enabled: false,
      })

      await waitFor(() => {
        expect(useLyricsEditingStore.getState().isRegenerating).toBe(true)
      })

      // Clean up
      resolvePromise!({
        lyrics: 'New lyrics',
        content_hash: 'hash',
        cached: false,
        processing_time: 1,
      })
    })

    it('should add new version to store on success', async () => {
      const mockResponse = {
        lyrics: 'New regenerated lyrics',
        content_hash: 'hash123',
        cached: false,
        processing_time: 2.5,
      }
      mockRegenerateLyrics.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      result.current.regenerate({
        content: 'Test content',
        search_enabled: false,
      })

      await waitFor(() => {
        expect(result.current.isRegenerating).toBe(false)
      })

      const state = useLyricsEditingStore.getState()
      expect(state.versions).toHaveLength(1)
      expect(state.versions[0].lyrics).toBe('New regenerated lyrics')
      expect(state.isRegenerating).toBe(false)
      expect(state.regenerationError).toBeNull()
    })

    it('should show success toast on successful regeneration', async () => {
      const mockResponse = {
        lyrics: 'New regenerated lyrics',
        content_hash: 'hash123',
        cached: false,
        processing_time: 2.5,
      }
      mockRegenerateLyrics.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      result.current.regenerate({
        content: 'Test content',
        search_enabled: false,
      })

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('Lyrics regenerated successfully!')
      })
    })

    it('should update active version to new version', async () => {
      const mockResponse = {
        lyrics: 'New regenerated lyrics',
        content_hash: 'hash123',
        cached: false,
        processing_time: 2.5,
      }
      mockRegenerateLyrics.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      result.current.regenerate({
        content: 'Test content',
        search_enabled: false,
      })

      await waitFor(() => {
        const state = useLyricsEditingStore.getState()
        expect(state.activeVersionId).toBe(state.versions[0]?.id)
        expect(state.editedLyrics).toBe('New regenerated lyrics')
      })
    })
  })

  describe('error handling', () => {
    it('should handle API errors', async () => {
      const errorMessage = 'API request failed'
      mockRegenerateLyrics.mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      result.current.regenerate({
        content: 'Test content',
        search_enabled: false,
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isRegenerating).toBe(false)
      })

      const state = useLyricsEditingStore.getState()
      expect(state.isRegenerating).toBe(false)
      expect(state.regenerationError).toBe(errorMessage)
    })

    it('should show error toast on failure', async () => {
      const errorMessage = 'Rate limit exceeded'
      mockRegenerateLyrics.mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      result.current.regenerate({
        content: 'Test content',
        search_enabled: false,
      })

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Regeneration Failed', errorMessage)
      })
    })

    it('should preserve existing versions on error', async () => {
      // Add an existing version
      useLyricsEditingStore.getState().addVersion('Existing lyrics')
      const existingVersions = useLyricsEditingStore.getState().versions

      mockRegenerateLyrics.mockRejectedValue(new Error('API error'))

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      result.current.regenerate({
        content: 'Test content',
        search_enabled: false,
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      const state = useLyricsEditingStore.getState()
      expect(state.versions).toEqual(existingVersions)
    })

    it('should handle errors without message', async () => {
      mockRegenerateLyrics.mockRejectedValue(new Error())

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      result.current.regenerate({
        content: 'Test content',
        search_enabled: false,
      })

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Regeneration Failed', 'Failed to regenerate lyrics')
      })
    })
  })

  describe('loading states', () => {
    it('should track loading state during regeneration', async () => {
      let resolvePromise: (value: unknown) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockRegenerateLyrics.mockReturnValue(promise as Promise<never>)

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      result.current.regenerate({
        content: 'Test content',
        search_enabled: false,
      })

      await waitFor(() => {
        expect(result.current.isRegenerating).toBe(true)
      })

      resolvePromise!({
        lyrics: 'New lyrics',
        content_hash: 'hash',
        cached: false,
        processing_time: 1,
      })

      await waitFor(() => {
        expect(result.current.isRegenerating).toBe(false)
      })
    })
  })

  describe('store integration', () => {
    it('should call store actions in correct order', async () => {
      const mockResponse = {
        lyrics: 'New lyrics',
        content_hash: 'hash123',
        cached: false,
        processing_time: 2.5,
      }
      mockRegenerateLyrics.mockResolvedValue(mockResponse)

      const startRegenerationSpy = jest.spyOn(useLyricsEditingStore.getState(), 'startRegeneration')
      const completeRegenerationSpy = jest.spyOn(useLyricsEditingStore.getState(), 'completeRegeneration')

      const { result } = renderHook(() => useRegenerateLyrics(), { wrapper: createWrapper() })

      result.current.regenerate({
        content: 'Test content',
        search_enabled: false,
      })

      await waitFor(() => {
        expect(startRegenerationSpy).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(completeRegenerationSpy).toHaveBeenCalledWith('New lyrics')
      })
    })
  })
})
