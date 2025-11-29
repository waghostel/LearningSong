import { useEffect, useState } from 'react'
import { useRateLimit } from '@/hooks/useLyrics'
import { cn } from '@/lib/utils'

export function RateLimitIndicator() {
  const { data, isLoading, error } = useRateLimit()
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  // Calculate time remaining until reset
  useEffect(() => {
    if (!data?.reset_time) return

    const updateTimer = () => {
      const resetTime = new Date(data.reset_time)
      const now = new Date()
      const diff = resetTime.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining('Resetting...')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [data?.reset_time])

  // Determine color based on remaining songs (WCAG AA compliant colors)
  const getColorClass = (remaining: number, total: number) => {
    if (remaining === total) return 'text-green-700 dark:text-green-500'
    if (remaining >= 1) return 'text-yellow-700 dark:text-yellow-500'
    return 'text-red-700 dark:text-red-500'
  }

  if (isLoading) {
    return (
      <div 
        className="flex items-center space-x-2 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-label="Loading rate limit information"
      >
        <span>Loading rate limit...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div 
        className="flex items-center space-x-2 text-sm text-red-700 dark:text-red-500"
        role="alert"
        aria-live="assertive"
      >
        <span>⚠️ Unable to load rate limit</span>
      </div>
    )
  }

  if (!data) return null

  const remaining = data.remaining
  const totalLimit = data.total_limit ?? 3

  return (
    <div 
      className="space-y-1"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={cn('flex items-center space-x-2 text-sm font-medium', getColorClass(remaining, totalLimit))}>
        <span aria-label={`${remaining} of ${totalLimit} songs remaining today`}>
          🎵 {remaining}/{totalLimit} songs remaining today
        </span>
      </div>
      
      {remaining === 0 && timeRemaining && (
        <div className="text-xs text-muted-foreground" aria-live="polite">
          Resets in: {timeRemaining}
        </div>
      )}
    </div>
  )
}
