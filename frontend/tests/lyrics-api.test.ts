import { generateLyrics, getRateLimit } from '@/api/lyrics'
import type { GenerateLyricsRequest, GenerateLyricsResponse, RateLimitResponse } from '@/api/lyrics'

// Mock the apiClient
jest.mock('@/api/client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}))

import { apiClient } from '@/api/client'
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('Lyrics API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateLyrics', () => {
    it('calls POST /api/lyrics/generate with correct data', async () => {
      const request: GenerateLyricsRequest = {
        content: 'Test educational content',
        search_enabled: false,
      }

      const mockResponse: GenerateLyricsResponse = {
        lyrics: 'Generated lyrics',
        content_hash: 'abc123',
        cached: false,
        processing_time: 15.5,
      }

      mockedApiClient.post.mockResolvedValue(mockResponse)

      const result = await generateLyrics(request)

      expect(mockedApiClient.post).toHaveBeenCalledWith('/api/lyrics/generate', request)
      expect(result).toEqual(mockResponse)
    })

    it('includes search_enabled flag when true', async () => {
      const request: GenerateLyricsRequest = {
        content: 'Short content',
        search_enabled: true,
      }

      const mockResponse: GenerateLyricsResponse = {
        lyrics: 'Enriched lyrics',
        content_hash: 'def456',
        cached: false,
        processing_time: 25.3,
      }

      mockedApiClient.post.mockResolvedValue(mockResponse)

      await generateLyrics(request)

      expect(mockedApiClient.post).toHaveBeenCalledWith('/api/lyrics/generate', {
        content: 'Short content',
        search_enabled: true,
      })
    })

    it('returns cached response when available', async () => {
      const request: GenerateLyricsRequest = {
        content: 'Cached content',
        search_enabled: false,
      }

      const mockResponse: GenerateLyricsResponse = {
        lyrics: 'Cached lyrics',
        content_hash: 'cached123',
        cached: true,
        processing_time: 0.1,
      }

      mockedApiClient.post.mockResolvedValue(mockResponse)

      const result = await generateLyrics(request)

      expect(result.cached).toBe(true)
      expect(result.processing_time).toBeLessThan(1)
    })

    it('handles network errors', async () => {
      const request: GenerateLyricsRequest = {
        content: 'Test content',
        search_enabled: false,
      }

      const networkError = new Error('Network Error')
      mockedApiClient.post.mockRejectedValue(networkError)

      await expect(generateLyrics(request)).rejects.toThrow('Network Error')
    })

    it('handles rate limit errors (429)', async () => {
      const request: GenerateLyricsRequest = {
        content: 'Test content',
        search_enabled: false,
      }

      const rateLimitError = {
        response: {
          status: 429,
          data: {
            error: 'Rate limit exceeded',
            retry_after: 3600,
          },
        },
      }

      mockedApiClient.post.mockRejectedValue(rateLimitError)

      await expect(generateLyrics(request)).rejects.toEqual(rateLimitError)
    })

    it('handles validation errors (400)', async () => {
      const request: GenerateLyricsRequest = {
        content: 'word '.repeat(10001),
        search_enabled: false,
      }

      const validationError = {
        response: {
          status: 400,
          data: {
            error: 'Content exceeds 10,000 words',
          },
        },
      }

      mockedApiClient.post.mockRejectedValue(validationError)

      await expect(generateLyrics(request)).rejects.toEqual(validationError)
    })

    it('handles server errors (500)', async () => {
      const request: GenerateLyricsRequest = {
        content: 'Test content',
        search_enabled: false,
      }

      const serverError = {
        response: {
          status: 500,
          data: {
            error: 'Internal server error',
          },
        },
      }

      mockedApiClient.post.mockRejectedValue(serverError)

      await expect(generateLyrics(request)).rejects.toEqual(serverError)
    })
  })

  describe('getRateLimit', () => {
    it('calls GET /api/user/rate-limit', async () => {
      const mockResponse: RateLimitResponse = {
        remaining: 3,
        reset_time: new Date().toISOString(),
      }

      mockedApiClient.get.mockResolvedValue(mockResponse)

      const result = await getRateLimit()

      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/user/rate-limit')
      expect(result).toEqual(mockResponse)
    })

    it('returns correct remaining count', async () => {
      const mockResponse: RateLimitResponse = {
        remaining: 2,
        reset_time: new Date(Date.now() + 86400000).toISOString(),
      }

      mockedApiClient.get.mockResolvedValue(mockResponse)

      const result = await getRateLimit()

      expect(result.remaining).toBe(2)
      expect(result.reset_time).toBeTruthy()
    })

    it('handles network errors', async () => {
      const networkError = new Error('Network Error')
      mockedApiClient.get.mockRejectedValue(networkError)

      await expect(getRateLimit()).rejects.toThrow('Network Error')
    })

    it('handles authentication errors (401)', async () => {
      const authError = {
        response: {
          status: 401,
          data: {
            error: 'Unauthorized',
          },
        },
      }

      mockedApiClient.get.mockRejectedValue(authError)

      await expect(getRateLimit()).rejects.toEqual(authError)
    })

    it('returns zero remaining when limit reached', async () => {
      const mockResponse: RateLimitResponse = {
        remaining: 0,
        reset_time: new Date(Date.now() + 3600000).toISOString(),
      }

      mockedApiClient.get.mockResolvedValue(mockResponse)

      const result = await getRateLimit()

      expect(result.remaining).toBe(0)
    })
  })
})
