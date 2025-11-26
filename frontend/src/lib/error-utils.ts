/**
 * Error handling utilities for Suno API and song generation
 * 
 * Provides user-friendly error messages and retry logic for various error scenarios:
 * - Timeout errors (>90s)
 * - API errors (500, 503)
 * - Rate limit errors (429)
 * - Invalid lyrics errors (400)
 * - Network errors
 */

export enum ErrorType {
  TIMEOUT = 'timeout',
  SERVER_ERROR = 'server_error',
  RATE_LIMIT = 'rate_limit',
  INVALID_LYRICS = 'invalid_lyrics',
  NETWORK = 'network',
  AUTH = 'auth',
  UNKNOWN = 'unknown',
}

export interface ErrorInfo {
  type: ErrorType
  message: string
  userMessage: string
  retryable: boolean
  retryDelay?: number // milliseconds
  statusCode?: number
}

/**
 * Error messages for different error types
 */
const ERROR_MESSAGES: Record<ErrorType, { userMessage: string; retryable: boolean }> = {
  [ErrorType.TIMEOUT]: {
    userMessage: 'Song generation is taking longer than expected. The server is still processing your request. You can wait or try again.',
    retryable: true,
  },
  [ErrorType.SERVER_ERROR]: {
    userMessage: 'Our music generation service is experiencing issues. Please try again in a few moments.',
    retryable: true,
  },
  [ErrorType.RATE_LIMIT]: {
    userMessage: 'You\'ve reached your song generation limit. Please wait before generating another song.',
    retryable: false,
  },
  [ErrorType.INVALID_LYRICS]: {
    userMessage: 'There\'s an issue with your lyrics. Please check the content and try again.',
    retryable: false,
  },
  [ErrorType.NETWORK]: {
    userMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
    retryable: true,
  },
  [ErrorType.AUTH]: {
    userMessage: 'Your session has expired. Please refresh the page to continue.',
    retryable: false,
  },
  [ErrorType.UNKNOWN]: {
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true,
  },
}

/**
 * Classify an error based on status code and error details
 */
export function classifyError(statusCode?: number, errorMessage?: string): ErrorType {
  // Check for timeout
  if (errorMessage?.toLowerCase().includes('timeout') || 
      errorMessage?.toLowerCase().includes('timed out') ||
      errorMessage?.toLowerCase().includes('econnaborted')) {
    return ErrorType.TIMEOUT
  }

  // Check for network errors
  if (!statusCode && (
    errorMessage?.toLowerCase().includes('network') ||
    errorMessage?.toLowerCase().includes('connection') ||
    errorMessage?.toLowerCase().includes('enotfound') ||
    errorMessage?.toLowerCase().includes('econnrefused')
  )) {
    return ErrorType.NETWORK
  }

  // Classify by status code
  switch (statusCode) {
    case 400:
      return ErrorType.INVALID_LYRICS
    case 401:
    case 403:
      return ErrorType.AUTH
    case 429:
      return ErrorType.RATE_LIMIT
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorType.SERVER_ERROR
    default:
      return ErrorType.UNKNOWN
  }
}

/**
 * Get detailed error information for display and retry logic
 */
export function getErrorInfo(
  statusCode?: number,
  errorMessage?: string,
  serverDetail?: string
): ErrorInfo {
  const type = classifyError(statusCode, errorMessage)
  const baseInfo = ERROR_MESSAGES[type]

  // Build user message with server details if available
  let userMessage = baseInfo.userMessage
  
  // For invalid lyrics, include server detail if available
  if (type === ErrorType.INVALID_LYRICS && serverDetail) {
    userMessage = `${serverDetail}. Please adjust your lyrics and try again.`
  }

  // For rate limit, include reset time if available
  if (type === ErrorType.RATE_LIMIT && serverDetail) {
    userMessage = `${baseInfo.userMessage} ${serverDetail}`
  }

  return {
    type,
    message: errorMessage || 'Unknown error',
    userMessage,
    retryable: baseInfo.retryable,
    retryDelay: getRetryDelay(type),
    statusCode,
  }
}

/**
 * Get recommended retry delay based on error type
 */
function getRetryDelay(type: ErrorType): number | undefined {
  switch (type) {
    case ErrorType.TIMEOUT:
      return 5000 // 5 seconds
    case ErrorType.SERVER_ERROR:
      return 3000 // 3 seconds
    case ErrorType.NETWORK:
      return 2000 // 2 seconds
    default:
      return undefined
  }
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(errorInfo: ErrorInfo): {
  title: string
  description: string
  showRetry: boolean
  retryLabel: string
} {
  const titles: Record<ErrorType, string> = {
    [ErrorType.TIMEOUT]: 'Generation Taking Too Long',
    [ErrorType.SERVER_ERROR]: 'Service Temporarily Unavailable',
    [ErrorType.RATE_LIMIT]: 'Rate Limit Reached',
    [ErrorType.INVALID_LYRICS]: 'Invalid Lyrics',
    [ErrorType.NETWORK]: 'Connection Error',
    [ErrorType.AUTH]: 'Authentication Error',
    [ErrorType.UNKNOWN]: 'Something Went Wrong',
  }

  const retryLabels: Record<ErrorType, string> = {
    [ErrorType.TIMEOUT]: 'Try Again',
    [ErrorType.SERVER_ERROR]: 'Retry',
    [ErrorType.RATE_LIMIT]: 'Check Status',
    [ErrorType.INVALID_LYRICS]: 'Edit Lyrics',
    [ErrorType.NETWORK]: 'Retry Connection',
    [ErrorType.AUTH]: 'Refresh Page',
    [ErrorType.UNKNOWN]: 'Try Again',
  }

  return {
    title: titles[errorInfo.type],
    description: errorInfo.userMessage,
    showRetry: errorInfo.retryable,
    retryLabel: retryLabels[errorInfo.type],
  }
}

/**
 * Check if an error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('timeout') ||
           error.message.toLowerCase().includes('timed out')
  }
  return false
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('network') ||
           error.message.toLowerCase().includes('connection') ||
           error.message.toLowerCase().includes('offline')
  }
  return false
}
