import { render, screen, fireEvent } from '@testing-library/react'
import { ProgressTracker } from '@/components/ProgressTracker'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import { ErrorType } from '@/lib/error-utils'

// Mock the store
jest.mock('@/stores/lyricsEditingStore')

describe('ProgressTracker Component', () => {
  const mockUseLyricsEditingStore = useLyricsEditingStore as unknown as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    // Default mock state - idle
    mockUseLyricsEditingStore.mockReturnValue({
      generationStatus: 'idle',
      progress: 0,
      error: null,
      errorInfo: null,
      canRetry: false,
    })
  })

  describe('Status Display', () => {
    it('does not render when status is idle', () => {
      const { container } = render(<ProgressTracker isConnected={true} />)
      
      expect(container.firstChild).toBeNull()
    })

    it('displays queued status correctly', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'queued',
        progress: 0,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      expect(screen.getByText('Queued')).toBeInTheDocument()
      expect(screen.getByText('Your song is in the queue...')).toBeInTheDocument()
    })

    it('displays processing status correctly', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'processing',
        progress: 50,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      expect(screen.getByText('Processing')).toBeInTheDocument()
      expect(screen.getByText('Generating your song...')).toBeInTheDocument()
    })

    it('displays completed status correctly', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'completed',
        progress: 100,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Song ready! Redirecting...')).toBeInTheDocument()
    })

    it('displays failed status correctly', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'failed',
        progress: 0,
        error: 'Generation failed',
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      expect(screen.getByText('Failed')).toBeInTheDocument()
      expect(screen.getByText('Generation failed. Please try again.')).toBeInTheDocument()
    })
  })

  describe('Progress Bar Updates', () => {
    it('shows progress bar when queued', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'queued',
        progress: 0,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
    })

    it('shows progress bar when processing', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'processing',
        progress: 45,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '45')
      expect(screen.getByText('45% complete')).toBeInTheDocument()
    })

    it('updates progress percentage display correctly', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'processing',
        progress: 75,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      expect(screen.getByText('75% complete')).toBeInTheDocument()
    })

    it('does not show progress bar when completed', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'completed',
        progress: 100,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('does not show progress bar when failed', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'failed',
        progress: 0,
        error: 'Error',
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })
  })

  describe('Connection Indicator', () => {
    it('shows connected status when isConnected is true', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'processing',
        progress: 50,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} connectionStatus="connected" />)

      const connectionStatus = screen.getByRole('status', { name: /connection status/i })
      expect(connectionStatus).toHaveTextContent('Connected')
    })

    it('shows disconnected status when isConnected is false', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'processing',
        progress: 50,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={false} connectionStatus="disconnected" />)

      const connectionStatus = screen.getByRole('status', { name: /connection status/i })
      expect(connectionStatus).toHaveTextContent('Disconnected')
    })

    it('shows connecting status', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'processing',
        progress: 50,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={false} connectionStatus="connecting" />)

      const connectionStatus = screen.getByRole('status', { name: /connection status/i })
      expect(connectionStatus).toHaveTextContent('Connecting...')
    })

    it('shows reconnecting status with attempt count', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'processing',
        progress: 50,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(
        <ProgressTracker 
          isConnected={false} 
          connectionStatus="reconnecting"
          reconnectAttempts={2}
          maxReconnectAttempts={5}
        />
      )

      const connectionStatus = screen.getByRole('status', { name: /connection status/i })
      expect(connectionStatus).toHaveTextContent('Reconnecting (2/5)...')
    })

    it('shows connection failed status', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'processing',
        progress: 50,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={false} connectionStatus="failed" />)

      const connectionStatus = screen.getByRole('status', { name: /connection status/i })
      expect(connectionStatus).toHaveTextContent('Connection failed')
    })

    it('shows retry button when connection failed and onReconnect provided', () => {
      const mockOnReconnect = jest.fn()
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'processing',
        progress: 50,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(
        <ProgressTracker 
          isConnected={false} 
          connectionStatus="failed"
          onReconnect={mockOnReconnect}
        />
      )

      const retryButton = screen.getByRole('button', { name: /retry connection/i })
      expect(retryButton).toBeInTheDocument()
      
      fireEvent.click(retryButton)
      expect(mockOnReconnect).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('displays error message when generation fails', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'failed',
        progress: 0,
        error: 'Something went wrong',
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      // There are multiple alert elements (wrapper and Alert component)
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('shows retry button when error is retryable', () => {
      const mockOnRetry = jest.fn()
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'failed',
        progress: 0,
        error: 'Server error',
        errorInfo: {
          type: ErrorType.SERVER_ERROR,
          message: 'Server error',
          userMessage: 'Our music generation service is experiencing issues.',
          retryable: true,
        },
        canRetry: true,
      })

      render(<ProgressTracker isConnected={true} onRetry={mockOnRetry} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeInTheDocument()
      
      fireEvent.click(retryButton)
      expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })

    it('does not show retry button when error is not retryable', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'failed',
        progress: 0,
        error: 'Rate limit reached',
        errorInfo: {
          type: ErrorType.RATE_LIMIT,
          message: 'Rate limit reached',
          userMessage: 'You have reached your song generation limit.',
          retryable: false,
        },
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} onRetry={jest.fn()} />)

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
    })

    it('shows rate limit message for rate limit errors', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'failed',
        progress: 0,
        error: 'Rate limit reached',
        errorInfo: {
          type: ErrorType.RATE_LIMIT,
          message: 'Rate limit reached',
          userMessage: 'You have reached your song generation limit.',
          retryable: false,
        },
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      expect(screen.getByText(/please wait for the rate limit to reset/i)).toBeInTheDocument()
    })

    it('shows invalid lyrics message for invalid lyrics errors', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'failed',
        progress: 0,
        error: 'Invalid lyrics',
        errorInfo: {
          type: ErrorType.INVALID_LYRICS,
          message: 'Invalid lyrics',
          userMessage: 'There is an issue with your lyrics.',
          retryable: false,
        },
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      expect(screen.getByText(/please edit your lyrics and try again/i)).toBeInTheDocument()
    })
  })

  describe('Cancel Button', () => {
    it('shows cancel button when onCancel provided and processing', () => {
      const mockOnCancel = jest.fn()
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'processing',
        progress: 50,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} onCancel={mockOnCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel song generation/i })
      expect(cancelButton).toBeInTheDocument()
      
      fireEvent.click(cancelButton)
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('does not show cancel button when completed', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'completed',
        progress: 100,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} onCancel={jest.fn()} />)

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes on progress region', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'processing',
        progress: 50,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      const region = screen.getByRole('region')
      expect(region).toHaveAttribute('aria-labelledby', 'progress-status')
      expect(region).toHaveAttribute('aria-live', 'polite')
    })

    it('has proper ARIA attributes on progress bar', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'processing',
        progress: 60,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '60')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      expect(progressBar).toHaveAttribute('aria-label', 'Song generation progress: 60% complete')
    })

    it('has connection status with proper aria-label', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'processing',
        progress: 50,
        error: null,
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} connectionStatus="connected" />)

      const connectionStatus = screen.getByRole('status', { name: /connection status: connected/i })
      expect(connectionStatus).toBeInTheDocument()
    })

    it('error alert has proper role', () => {
      mockUseLyricsEditingStore.mockReturnValue({
        generationStatus: 'failed',
        progress: 0,
        error: 'Error occurred',
        errorInfo: null,
        canRetry: false,
      })

      render(<ProgressTracker isConnected={true} />)

      // There are multiple alert elements (wrapper and Alert component)
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
    })
  })
})
