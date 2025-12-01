import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { auth, isDevelopmentMode } from '@/lib/firebase'
import type { SongStatusUpdate } from '@/api/songs'
import { getErrorInfo, type ErrorInfo } from '@/lib/error-utils'

/**
 * WebSocket connection status
 */
export type ConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed'

interface UseWebSocketOptions {
  taskId: string | null
  onStatusUpdate?: (update: SongStatusUpdate) => void
  onComplete?: (songUrl: string) => void
  onError?: (error: string, errorInfo?: ErrorInfo) => void
  onConnectionChange?: (status: ConnectionStatus) => void
}

interface UseWebSocketReturn {
  isConnected: boolean
  connectionStatus: ConnectionStatus
  error: string | null
  errorInfo: ErrorInfo | null
  reconnectAttempts: number
  maxReconnectAttempts: number
  manualReconnect: () => void
}

// Get WebSocket URL from environment
// Vite exposes import.meta.env, but we'll use a fallback for test environments
const WS_URL = 'http://localhost:8000' // Default for development and tests
const MAX_RECONNECT_ATTEMPTS = 5
const INITIAL_RECONNECT_DELAY = 1000 // 1 second
const MAX_RECONNECT_DELAY = 30000 // 30 seconds

/**
 * Custom hook for WebSocket connection to receive real-time song generation updates
 * 
 * Features:
 * - Authenticates with Firebase token
 * - Auto-reconnects with exponential backoff
 * - Subscribes to task-specific updates
 * - Handles connection/disconnection events
 * - Provides connection status indicator
 * - Enhanced error handling with user-friendly messages
 * 
 * @param options - Configuration options
 * @returns Connection state and status
 */
export const useWebSocket = ({
  taskId,
  onStatusUpdate,
  onComplete,
  onError,
  onConnectionChange,
}: UseWebSocketOptions): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  
  const socketRef = useRef<Socket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY)

  /**
   * Update connection status and notify listeners
   */
  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status)
    setIsConnected(status === 'connected')
    onConnectionChange?.(status)
  }, [onConnectionChange])

  /**
   * Get Firebase authentication token for WebSocket connection
   */
  const getAuthToken = useCallback(async (): Promise<string> => {
    // Development mode: use mock token
    if (isDevelopmentMode || !auth) {
      return 'dev-token-local'
    }

    // Production mode: get Firebase token
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('No authenticated user')
      }
      const token = await currentUser.getIdToken()
      return token
    } catch (err) {
      console.error('Error getting auth token:', err)
      throw err
    }
  }, [])

  /**
   * Calculate exponential backoff delay for reconnection
   */
  const calculateBackoffDelay = useCallback((attempt: number): number => {
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, attempt),
      MAX_RECONNECT_DELAY
    )
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000
  }, [])

  /**
   * Handle WebSocket error with enhanced error info
   */
  const handleError = useCallback((errorMessage: string, isNetworkError = false) => {
    const errInfo = getErrorInfo(
      undefined, 
      isNetworkError ? 'network' : errorMessage
    )
    setError(errInfo.userMessage)
    setErrorInfo(errInfo)
    onError?.(errInfo.userMessage, errInfo)
  }, [onError])

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async () => {
    if (!taskId) return

    updateConnectionStatus('connecting')

    try {
      const token = await getAuthToken()

      // Create socket connection
      const socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false, // We handle reconnection manually
        timeout: 20000, // 20 second connection timeout
      })

      socketRef.current = socket

      // Connection successful
      socket.on('connect', async () => {
        updateConnectionStatus('connected')
        setError(null)
        setErrorInfo(null)
        setReconnectAttempts(0)
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY

        // Subscribe to task updates with token
        try {
          const subscribeToken = await getAuthToken()
          socket.emit('subscribe', { task_id: taskId, token: subscribeToken })
        } catch {
          handleError('Authentication failed')
        }
      })

      // Receive status updates
      socket.on('song_status', (update: SongStatusUpdate) => {
        // Call status update callback
        onStatusUpdate?.(update)

        // Handle completion
        if (update.status === 'completed' && update.song_url) {
          onComplete?.(update.song_url)
        }

        // Handle failure from server
        if (update.status === 'failed' && update.error) {
          const errInfo = getErrorInfo(undefined, update.error)
          onError?.(errInfo.userMessage, errInfo)
        }
      })

      // Connection error
      socket.on('connect_error', (err) => {
        console.error('WebSocket connection error:', err)
        
        // Determine if this is a network error
        const isNetworkError = err.message.includes('timeout') || 
                               err.message.includes('network') ||
                               err.message.includes('ECONNREFUSED')
        
        // Attempt reconnection if we haven't exceeded max attempts
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          updateConnectionStatus('reconnecting')
          const delay = calculateBackoffDelay(reconnectAttempts)
          
          // Set temporary error message during reconnection
          setError(`Connection lost. Reconnecting... (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1)
            reconnectDelayRef.current = delay
            connect()
          }, delay)
        } else {
          // Max reconnection attempts reached
          updateConnectionStatus('failed')
          handleError(
            'Unable to establish real-time connection. You can still check status manually.',
            isNetworkError
          )
        }
      })

      // Disconnection
      socket.on('disconnect', (reason) => {
        // Auto-reconnect if disconnected unexpectedly
        if (reason === 'io server disconnect') {
          // Server disconnected intentionally, don't reconnect
          updateConnectionStatus('disconnected')
          handleError('Server closed the connection')
        } else if (reason === 'transport close' || reason === 'ping timeout') {
          // Network issue, attempt reconnection
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            updateConnectionStatus('reconnecting')
            const delay = calculateBackoffDelay(reconnectAttempts)
            
            setError(`Connection lost. Reconnecting... (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`)
            
            reconnectTimeoutRef.current = setTimeout(() => {
              setReconnectAttempts(prev => prev + 1)
              reconnectDelayRef.current = delay
              connect()
            }, delay)
          } else {
            updateConnectionStatus('failed')
            handleError('Connection lost. Please check your internet connection.', true)
          }
        } else {
          updateConnectionStatus('disconnected')
        }
      })

      // Error event
      socket.on('error', (err) => {
        console.error('WebSocket error:', err)
        handleError(err.message || 'WebSocket error occurred')
      })

    } catch (err) {
      console.error('Error connecting to WebSocket:', err)
      updateConnectionStatus('failed')
      handleError(err instanceof Error ? err.message : 'Failed to connect', true)
    }
  }, [taskId, getAuthToken, calculateBackoffDelay, reconnectAttempts, onStatusUpdate, onComplete, onError, updateConnectionStatus, handleError])

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Close socket connection
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }

    updateConnectionStatus('disconnected')
    setReconnectAttempts(0)
    reconnectDelayRef.current = INITIAL_RECONNECT_DELAY
  }, [updateConnectionStatus])

  /**
   * Manual reconnect function for user-triggered reconnection
   */
  const manualReconnect = useCallback(() => {
    // Reset reconnect attempts for manual reconnection
    setReconnectAttempts(0)
    reconnectDelayRef.current = INITIAL_RECONNECT_DELAY
    setError(null)
    setErrorInfo(null)
    
    // Disconnect existing connection if any
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
    
    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // Attempt to connect
    connect()
  }, [connect])

  // Connect when taskId is available
  useEffect(() => {
    if (taskId) {
      connect()
    }

    // Cleanup on unmount or taskId change
    return () => {
      disconnect()
    }
  }, [taskId, connect, disconnect])

  return {
    isConnected,
    connectionStatus,
    error,
    errorInfo,
    reconnectAttempts,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
    manualReconnect,
  }
}
