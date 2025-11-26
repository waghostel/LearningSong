import { useState, useEffect, useCallback, useRef } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  wasOffline: boolean
  lastOnlineAt: Date | null
  lastOfflineAt: Date | null
}

interface UseNetworkStatusOptions {
  onOnline?: () => void
  onOffline?: () => void
}

interface UseNetworkStatusReturn extends NetworkStatus {
  checkConnection: () => Promise<boolean>
}

/**
 * Custom hook for detecting network status and handling offline/online transitions
 * 
 * Features:
 * - Detects browser online/offline events
 * - Tracks when the connection was last online/offline
 * - Provides callback for online/offline transitions
 * - Allows manual connection check
 * 
 * @param options - Configuration options
 * @returns Network status and control functions
 */
export const useNetworkStatus = ({
  onOnline,
  onOffline,
}: UseNetworkStatusOptions = {}): UseNetworkStatusReturn => {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [wasOffline, setWasOffline] = useState(false)
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null)
  const [lastOfflineAt, setLastOfflineAt] = useState<Date | null>(null)
  
  const onOnlineRef = useRef(onOnline)
  const onOfflineRef = useRef(onOffline)
  
  // Keep refs updated
  useEffect(() => {
    onOnlineRef.current = onOnline
    onOfflineRef.current = onOffline
  }, [onOnline, onOffline])

  /**
   * Handle online event
   */
  const handleOnline = useCallback(() => {
    setIsOnline(true)
    setLastOnlineAt(new Date())
    onOnlineRef.current?.()
  }, [])

  /**
   * Handle offline event
   */
  const handleOffline = useCallback(() => {
    setIsOnline(false)
    setWasOffline(true)
    setLastOfflineAt(new Date())
    onOfflineRef.current?.()
  }, [])

  /**
   * Manual connection check by attempting to fetch a small resource
   */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Try to fetch a small resource to verify actual connectivity
      // Using a timestamp to prevent caching
      const response = await fetch(`/favicon.ico?_=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
      })
      const online = response.ok
      setIsOnline(online)
      if (online) {
        setLastOnlineAt(new Date())
      }
      return online
    } catch {
      setIsOnline(false)
      setWasOffline(true)
      setLastOfflineAt(new Date())
      return false
    }
  }, [])

  // Setup event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  return {
    isOnline,
    wasOffline,
    lastOnlineAt,
    lastOfflineAt,
    checkConnection,
  }
}
