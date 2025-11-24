import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { generateLyrics, getRateLimit } from '@/api/lyrics'
import type { GenerateLyricsRequest, GenerateLyricsResponse, RateLimitResponse } from '@/api/lyrics'
import { handleApiError, showSuccess } from '@/lib/toast-utils'

// Mutation hook for generating lyrics
export const useGenerateLyrics = () => {
  const queryClient = useQueryClient()
  
  return useMutation<GenerateLyricsResponse, Error, GenerateLyricsRequest>({
    mutationFn: generateLyrics,
    onSuccess: (data) => {
      showSuccess(
        'Lyrics Generated!',
        data.cached ? 'Retrieved from cache' : 'Successfully created new lyrics'
      )
      // Invalidate rate limit query to refresh the counter
      queryClient.invalidateQueries({ queryKey: ['rateLimit'] })
    },
    onError: (error) => {
      console.error('Failed to generate lyrics:', error)
      // Show toast with retry option
      handleApiError(error, {
        onRetry: () => {
          // Retry the mutation with the same variables
          queryClient.invalidateQueries({ queryKey: ['generateLyrics'] })
        },
      })
    },
  })
}

// Query hook for fetching rate limit
export const useRateLimit = () => {
  return useQuery<RateLimitResponse, Error>({
    queryKey: ['rateLimit'],
    queryFn: getRateLimit,
    refetchInterval: 60000, // Refetch every minute
    retry: 2,
  })
}
