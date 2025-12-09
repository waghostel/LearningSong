import { apiClient } from './client'

// TypeScript interfaces
export interface GenerateLyricsRequest {
  content: string
  search_enabled: boolean
}

export interface GenerateLyricsResponse {
  lyrics: string
  content_hash: string
  cached: boolean
  processing_time: number
}

export interface RateLimitResponse {
  remaining: number
  reset_time: string
  total_limit: number
}

// API functions
export const generateLyrics = async (
  request: GenerateLyricsRequest
): Promise<GenerateLyricsResponse> => {
  return apiClient.post<GenerateLyricsResponse>('/api/lyrics/generate', request)
}

export const regenerateLyrics = async (
  request: GenerateLyricsRequest
): Promise<GenerateLyricsResponse> => {
  return apiClient.post<GenerateLyricsResponse>('/api/lyrics/regenerate', request)
}

export const getRateLimit = async (): Promise<RateLimitResponse> => {
  return apiClient.get<RateLimitResponse>('/api/lyrics/rate-limit')
}
