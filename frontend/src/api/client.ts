import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { getErrorInfo, ErrorType, type ErrorInfo } from '@/lib/error-utils'
import { auth, isDevelopmentMode } from '@/lib/firebase'

// Get API base URL from environment
// Vite exposes import.meta.env, but we'll use a fallback for test environments
const API_BASE_URL = 'http://localhost:8000' // Default for development and tests

// Development mode token for mock authentication
const DEV_AUTH_TOKEN = 'dev-token-local'

// Custom error class for API errors with enhanced error information
export class ApiError extends Error {
  public errorInfo: ErrorInfo

  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string,
    public retryable: boolean = false,
    public serverDetail?: string
  ) {
    super(message)
    this.name = 'ApiError'
    this.errorInfo = getErrorInfo(statusCode, message, serverDetail)
  }

  /**
   * Get the error type for categorization
   */
  get type(): ErrorType {
    return this.errorInfo.type
  }

  /**
   * Get user-friendly error message
   */
  get userMessage(): string {
    return this.errorInfo.userMessage
  }

  /**
   * Check if this is a timeout error
   */
  get isTimeout(): boolean {
    return this.errorInfo.type === ErrorType.TIMEOUT
  }

  /**
   * Check if this is a rate limit error
   */
  get isRateLimit(): boolean {
    return this.errorInfo.type === ErrorType.RATE_LIMIT
  }

  /**
   * Check if this is a server error
   */
  get isServerError(): boolean {
    return this.errorInfo.type === ErrorType.SERVER_ERROR
  }

  /**
   * Check if this is an invalid lyrics error
   */
  get isInvalidLyrics(): boolean {
    return this.errorInfo.type === ErrorType.INVALID_LYRICS
  }
}

// Helper to create user-friendly error messages using error utilities
function getUserFriendlyErrorMessage(error: AxiosError): { 
  message: string
  retryable: boolean
  serverDetail?: string
} {
  const status = error.response?.status
  const data = error.response?.data as { detail?: string; error?: string; reset_time?: string } | undefined
  
  // Get server detail for more specific error messages
  const serverDetail = data?.detail || data?.error

  // Network errors (no response)
  if (!error.response) {
    const errorInfo = getErrorInfo(undefined, error.message || error.code)
    
    return {
      message: errorInfo.userMessage,
      retryable: errorInfo.retryable,
    }
  }

  // Use error utilities to classify and get error info
  const errorInfo = getErrorInfo(status, error.message, serverDetail)

  // Add reset time for rate limit errors
  if (errorInfo.type === ErrorType.RATE_LIMIT && data?.reset_time) {
    return {
      message: `${errorInfo.userMessage} Reset time: ${data.reset_time}`,
      retryable: errorInfo.retryable,
      serverDetail: `Reset time: ${data.reset_time}`,
    }
  }

  return {
    message: errorInfo.userMessage,
    retryable: errorInfo.retryable,
    serverDetail,
  }
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 90000, // 90 seconds for song generation
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor - use async to get Firebase token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          // Development mode: use mock token
          if (isDevelopmentMode || !auth) {
            config.headers.Authorization = `Bearer ${DEV_AUTH_TOKEN}`
            return config
          }

          // Production mode: get Firebase ID token
          const currentUser = auth.currentUser
          if (currentUser) {
            const token = await currentUser.getIdToken()
            config.headers.Authorization = `Bearer ${token}`
          }
        } catch (error) {
          console.error('Error getting auth token:', error)
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Handle common errors
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('authToken')
        }

        // Transform error into user-friendly ApiError with enhanced error info
        const { message, retryable, serverDetail } = getUserFriendlyErrorMessage(error)
        const apiError = new ApiError(
          message,
          error.response?.status,
          error.code,
          retryable,
          serverDetail
        )

        // Log error for debugging (in development)
        if (process.env.NODE_ENV === 'development') {
          console.error('API Error:', {
            type: apiError.type,
            statusCode: apiError.statusCode,
            message: apiError.message,
            userMessage: apiError.userMessage,
            retryable: apiError.retryable,
            serverDetail: apiError.serverDetail,
          })
        }

        return Promise.reject(apiError)
      }
    )
  }

  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config)
    return response.data
  }

  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config)
    return response.data
  }

  async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config)
    return response.data
  }

  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config)
    return response.data
  }

  async patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config)
    return response.data
  }
}

export const apiClient = new ApiClient()
export default apiClient
