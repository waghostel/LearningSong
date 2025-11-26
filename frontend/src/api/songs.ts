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
