/**
 * Utility functions for error message mapping
 * Extracted to avoid react-refresh warnings
 */

/**
 * Map API/backend error messages to user-friendly messages
 * Property 7: Error Message User-Friendliness - no technical details exposed
 */
export function mapErrorToUserFriendly(error: string | Error | null): string {
  if (!error) return 'An unexpected error occurred. Please try again.'
  
  const errorMessage = typeof error === 'string' ? error : error.message
  const lowerMessage = errorMessage.toLowerCase()
  
  // Map known error patterns to user-friendly messages
  if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
    return 'This song could not be found. It may have been deleted.'
  }
  if (lowerMessage.includes('410') || lowerMessage.includes('expired')) {
    return 'This song has expired and is no longer available.'
  }
  if (lowerMessage.includes('403') || lowerMessage.includes('forbidden') || lowerMessage.includes('unauthorized')) {
    return 'You do not have permission to access this song.'
  }
  if (lowerMessage.includes('429') || lowerMessage.includes('rate limit')) {
    return "You've reached your daily limit. Please try again tomorrow."
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('offline') || lowerMessage.includes('fetch')) {
    return 'Unable to connect. Please check your internet connection.'
  }
  if (lowerMessage.includes('timeout')) {
    return 'The request took too long. Please try again.'
  }
  
  // Default user-friendly message - never expose technical details
  return 'Something went wrong. Please try again later.'
}
