import { apiClient, ApiError } from './client'

// Music Style enum with 8 preset styles
export enum MusicStyle {
  POP = 'pop',
  RAP = 'rap',
  FOLK = 'folk',
  ELECTRONIC = 'electronic',
  ROCK = 'rock',
  JAZZ = 'jazz',
  CHILDREN = 'children',
  CLASSICAL = 'classical',
}

// TypeScript interfaces
export interface GenerateSongRequest {
  lyrics: string
  style: MusicStyle
  content_hash?: string
}

export interface GenerateSongResponse {
  task_id: string
  estimated_time: number // seconds
}

export interface SongStatusUpdate {
  task_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number // 0-100
  song_url?: string
  error?: string
}

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

/**
 * Helper function to retry API calls with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    // Only retry if error is retryable and we have retries left
    if (error instanceof ApiError && error.retryable && retries > 0) {
      const delay = RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries)
      await new Promise(resolve => setTimeout(resolve, delay))
      return retryWithBackoff(fn, retries - 1)
    }
    throw error
  }
}

// API functions
export const generateSong = async (
  request: GenerateSongRequest
): Promise<GenerateSongResponse> => {
  return retryWithBackoff(() =>
    apiClient.post<GenerateSongResponse>('/api/songs/generate', request)
  )
}

export const getSongStatus = async (
  taskId: string
): Promise<SongStatusUpdate> => {
  return retryWithBackoff(() =>
    apiClient.get<SongStatusUpdate>(`/api/songs/${taskId}`)
  )
}

/**
 * TEST FUNCTION: Generate song with simulated timeout
 * This calls a special backend endpoint that simulates a 90+ second timeout
 * for testing timeout handling in the frontend.
 */
export const generateSongWithTimeout = async (
  request: GenerateSongRequest
): Promise<GenerateSongResponse> => {
  // No retry for timeout test - we want to see the timeout behavior
  return apiClient.post<GenerateSongResponse>('/api/songs/generate-timeout-test', request)
}

// Song Details interfaces for playback page
export interface SongDetails {
  song_id: string
  song_url: string
  lyrics: string
  style: MusicStyle
  created_at: string  // ISO datetime
  expires_at: string  // ISO datetime
  is_owner: boolean
}

export interface ShareLinkResponse {
  share_url: string
  share_token: string
  expires_at: string  // ISO datetime
}

/**
 * Get complete song details for playback page
 * @param songId - The ID of the song to retrieve
 * @returns SongDetails with song_url, lyrics, style, metadata, and expiration info
 * @throws ApiError with 404 if song not found, 410 if expired, 403 if unauthorized
 */
export const getSongDetails = async (songId: string): Promise<SongDetails> => {
  return retryWithBackoff(() =>
    apiClient.get<SongDetails>(`/api/songs/${songId}/details`)
  )
}

/**
 * Get song details via share token (no auth required)
 * @param shareToken - The share token from the shared link
 * @returns SongDetails for the shared song
 * @throws ApiError with 404 if share token not found, 410 if share link expired
 */
export const getSharedSong = async (shareToken: string): Promise<SongDetails> => {
  return retryWithBackoff(() =>
    apiClient.get<SongDetails>(`/api/songs/shared/${shareToken}`)
  )
}

/**
 * Generate a shareable link for a song
 * @param songId - The ID of the song to share
 * @returns ShareLinkResponse with share_url and expires_at
 * @throws ApiError with 403 if user doesn't own the song, 404 if song not found
 */
export const createShareLink = async (songId: string): Promise<ShareLinkResponse> => {
  return retryWithBackoff(() =>
    apiClient.post<ShareLinkResponse>(`/api/songs/${songId}/share`)
  )
}
