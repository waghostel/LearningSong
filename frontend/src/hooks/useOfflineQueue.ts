import { useState, useCallback, useEffect, useRef } from 'react'
import { useNetworkStatus } from './useNetworkStatus'

interface QueuedAction<T = unknown> {
  id: string
  action: () => Promise<T>
  timestamp: Date
  retryCount: number
  maxRetries: number
}

interface UseOfflineQueueOptions {
  maxRetries?: number
  onActionComplete?: (id: string, result: unknown) => void
  onActionFailed?: (id: string, error: Error) => void
  onQueueProcessed?: () => void
}

interface UseOfflineQueueReturn {
  queueAction: <T>(action: () => Promise<T>, id?: string) => string
  removeAction: (id: string) => void
  clearQueue: () => void
  processQueue: () => Promise<void>
  queueLength: number
  isProcessing: boolean
  isOnline: boolean
  wasOffline: boolean
}

/**
 * Custom hook for queuing actions when offline and processing them when back online
 * 
 * Features:
 * - Queue actions when offline
 * - Automatically process queue when back online
 * - Retry failed actions with configurable max retries
 * - Provides queue management functions
 * 
 * @param options - Configuration options
 * @returns Queue state and control functions
 */
export const useOfflineQueue = ({
  maxRetries = 3,
  onActionComplete,
  onActionFailed,
  onQueueProcessed,
}: UseOfflineQueueOptions = {}): UseOfflineQueueReturn => {
  const [queue, setQueue] = useState<QueuedAction[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  const processingRef = useRef(false)
  const queueRef = useRef(queue)
  
  // Keep queue ref updated
  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  /**
   * Process the queue when back online
   */
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return
    
    processingRef.current = true
    setIsProcessing(true)
    
    const currentQueue = [...queueRef.current]
    const failedActions: QueuedAction[] = []
    
    for (const item of currentQueue) {
      try {
        const result = await item.action()
        onActionComplete?.(item.id, result)
      } catch (error) {
        console.error(`Failed to process queued action ${item.id}:`, error)
        
        if (item.retryCount < item.maxRetries) {
          // Add back to queue with incremented retry count
          failedActions.push({
            ...item,
            retryCount: item.retryCount + 1,
          })
        } else {
          // Max retries reached, notify failure
          onActionFailed?.(item.id, error instanceof Error ? error : new Error(String(error)))
        }
      }
    }
    
    // Update queue with failed actions that can be retried
    setQueue(failedActions)
    
    processingRef.current = false
    setIsProcessing(false)
    
    if (failedActions.length === 0) {
      onQueueProcessed?.()
    }
  }, [onActionComplete, onActionFailed, onQueueProcessed])

  /**
   * Handle coming back online
   */
  const handleOnline = useCallback(() => {
    // Process queue when back online
    processQueue()
  }, [processQueue])

  // Use network status hook
  const { isOnline, wasOffline } = useNetworkStatus({
    onOnline: handleOnline,
  })

  /**
   * Generate unique ID for queued action
   */
  const generateId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  /**
   * Queue an action to be executed when online
   */
  const queueAction = useCallback(<T,>(
    action: () => Promise<T>,
    id?: string
  ): string => {
    const actionId = id || generateId()
    
    // If online, execute immediately
    if (isOnline) {
      action()
        .then((result) => onActionComplete?.(actionId, result))
        .catch((error) => onActionFailed?.(actionId, error instanceof Error ? error : new Error(String(error))))
      return actionId
    }
    
    // Queue for later
    const queuedAction: QueuedAction = {
      id: actionId,
      action: action as () => Promise<unknown>,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries,
    }
    
    setQueue((prev) => [...prev, queuedAction])
    return actionId
  }, [isOnline, generateId, maxRetries, onActionComplete, onActionFailed])

  /**
   * Remove an action from the queue
   */
  const removeAction = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }, [])

  /**
   * Clear all queued actions
   */
  const clearQueue = useCallback(() => {
    setQueue([])
  }, [])

  return {
    queueAction,
    removeAction,
    clearQueue,
    processQueue,
    queueLength: queue.length,
    isProcessing,
    isOnline,
    wasOffline,
  }
}
