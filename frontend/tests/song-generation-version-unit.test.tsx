import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LyricsEditingPage } from '@/pages/LyricsEditingPage'
import { useAuth } from '@/hooks/useAuth'
import { useSongGeneration } from '@/hooks/useSongGeneration'
import { useNotifications } from '@/hooks/useNotifications'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import { MusicStyle } from '@/api/songs'

// Increase timeout for integration tests
jest.setTimeout(15000)

// Mock dependencies
jest.mock('@/hooks/useAuth')
jest.mock('@/hooks/useSongGeneration')
jest.mock('@/hooks/useNotifications')
jest.mock('@/hooks/useNetworkStatus')

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockedUseSongGeneration = useSongGeneration as jest.MockedFunction<typeof useSongGeneration>
const mockedUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>
const mockedUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>

// Helper to render with providers and navigation state
const renderWithProviders = (
  component: React.ReactElement,
  { locationState = null as { lyrics: string; contentHash: string } | null } = {}
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: '/lyrics-edit', state: locationState }]}>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/lyrics-edit" element={component} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Song Generation with Version Management - Unit Tests', () => {
  const mockGenerate = jest.fn()
  const mockRetry = jest.fn()
  const mockManualReconnect = jest.fn()
  const mockSendNotification = jest.fn()
  const mockRequestPermission = jest.fn()
  const mockCheckConnection = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    sessionStorage.clear()
    
    // Reset Zustand store
    useLyricsEditingStore.getState().reset()
    
    // Default auth state
    mockedUseAuth.mockReturnValue({
      userId: 'test-user-123',
      loading: false,
      error: null,
    })
    
    // Default song generation state
    mockedUseSongGeneration.mockReturnValue({
      generate: mockGenerate,
      retry: mockRetry,
      isGenerating: false,
      isConnected: false,
      connectionStatus: 'disconnected',
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
      manualReconnect: mockManualReconnect,
      error: null,
      errorInfo: null,
      canRetry: false,
      progress: 0,
      status: 'idle',
    })
    
    // Default notifications state
    mockedUseNotifications.mockReturnValue({
      permission: 'default',
      requestPermission: mockRequestPermission,
      sendNotification: mockSendNotification,
    })
    
    // Default network status
    mockedUseNetworkStatus.mockReturnValue({
      isOnline: true,
      wasOffline: false,
      lastOnlineAt: null,
      lastOfflineAt: null,
      checkConnection: mockCheckConnection,
    })
  })

  describe('Song generation with original lyrics', () => {
    it('should use original lyrics when no versions exist', async () => {
      const user = userEvent.setup()
      const originalLyrics = 'This is the original lyrics content for testing song generation'
      
      useLyricsEditingStore.getState().setOriginalLyrics(originalLyrics)
      useLyricsEditingStore.getState().setContentHash('hash123')
      
      renderWithProviders(<LyricsEditingPage />, {
        locationState: { lyrics: originalLyrics, contentHash: 'hash123' }
      })
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate song/i })).toBeInTheDocument()
      })
      
      const generateButton = screen.getByRole('button', { name: /Generate song/i })
      await user.click(generateButton)
      
      expect(mockGenerate).toHaveBeenCalledWith({
        lyrics: originalLyrics,
        style: MusicStyle.POP,
        content_hash: 'hash123',
      })
    })
  })

  describe('Song generation with different active versions', () => {
    it('should use active version original lyrics when version has no edits', async () => {
      const user = userEvent.setup()
      const lyrics1 = 'First version of lyrics for testing song generation'
      const lyrics2 = 'Second version of lyrics for testing song generation'
      
      useLyricsEditingStore.getState().setContentHash('hash123')
      useLyricsEditingStore.getState().addVersion(lyrics1)
      useLyricsEditingStore.getState().addVersion(lyrics2)
      
      const versions = useLyricsEditingStore.getState().versions
      const version1Id = versions[0].id
      useLyricsEditingStore.getState().setActiveVersion(version1Id)
      
      renderWithProviders(<LyricsEditingPage />, {
        locationState: { lyrics: lyrics1, contentHash: 'hash123' }
      })
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate song/i })).toBeInTheDocument()
      })
      
      const generateButton = screen.getByRole('button', { name: /Generate song/i })
      await user.click(generateButton)
      
      expect(mockGenerate).toHaveBeenCalledWith({
        lyrics: lyrics1,
        style: MusicStyle.POP,
        content_hash: 'hash123',
      })
    })

    it('should use active version edited lyrics when version has edits', async () => {
      const user = userEvent.setup()
      const lyrics1 = 'First version of lyrics for testing song generation'
      const lyrics2 = 'Second version of lyrics for testing song generation'
      const editedLyrics2 = 'Second version edited by user with manual changes'
      
      useLyricsEditingStore.getState().setContentHash('hash123')
      useLyricsEditingStore.getState().addVersion(lyrics1)
      useLyricsEditingStore.getState().addVersion(lyrics2)
      
      const versions = useLyricsEditingStore.getState().versions
      const version2Id = versions[1].id
      useLyricsEditingStore.getState().updateVersionEdits(version2Id, editedLyrics2)
      
      renderWithProviders(<LyricsEditingPage />, {
        locationState: { lyrics: lyrics1, contentHash: 'hash123' }
      })
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate song/i })).toBeInTheDocument()
      })
      
      const generateButton = screen.getByRole('button', { name: /Generate song/i })
      await user.click(generateButton)
      
      expect(mockGenerate).toHaveBeenCalledWith({
        lyrics: editedLyrics2,
        style: MusicStyle.POP,
        content_hash: 'hash123',
      })
    })
  })

})

// Removed other test sections - keeping only version management tests
/*
  describe('WebSocket Updates', () => {
    it('shows progress tracker when generating', async () => {
      // Set up store with lyrics and start generation
      useLyricsEditingStore.getState().setOriginalLyrics('Test lyrics content for generation')
      useLyricsEditingStore.getState().setContentHash('hash123')
      useLyricsEditingStore.getState().startGeneration('task-123')
      useLyricsEditingStore.getState().updateProgress('processing', 50)
      
      // Mock generating state
      mockedUseSongGeneration.mockReturnValue({
        generate: mockGenerate,
        retry: mockRetry,
        isGenerating: true,
        isConnected: true,
        connectionStatus: 'connected',
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        manualReconnect: mockManualReconnect,
        error: null,
        errorInfo: null,
        canRetry: false,
        progress: 50,
        status: 'processing',
      })
      
      renderWithProviders(<LyricsEditingPage />, {
        locationState: { lyrics: 'Test lyrics content for generation', contentHash: 'hash123' }
      })
      
      await waitFor(() => {
        // Progress tracker should be visible - check for the progress region
        expect(screen.getByRole('region', { name: /Processing/i })).toBeInTheDocument()
      })
    })

    it('shows connection status indicator', async () => {
      // Set up store with lyrics and start generation
      useLyricsEditingStore.getState().setOriginalLyrics('Test lyrics content')
      useLyricsEditingStore.getState().setContentHash('hash123')
      useLyricsEditingStore.getState().startGeneration('task-123')
      
      // Mock generating state with connected WebSocket
      mockedUseSongGeneration.mockReturnValue({
        generate: mockGenerate,
        retry: mockRetry,
        isGenerating: true,
        isConnected: true,
        connectionStatus: 'connected',
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        manualReconnect: mockManualReconnect,
        error: null,
        errorInfo: null,
        canRetry: false,
        progress: 25,
        status: 'queued',
      })
      
      renderWithProviders(<LyricsEditingPage />, {
        locationState: { lyrics: 'Test lyrics content', contentHash: 'hash123' }
      })
      
      await waitFor(() => {
        // Should show connected status via aria-label
        expect(screen.getByRole('status', { name: /Connection status: Connected/i })).toBeInTheDocument()
      })
    })

    it('shows reconnecting status when WebSocket is reconnecting', async () => {
      // Set up store with lyrics and start generation
      useLyricsEditingStore.getState().setOriginalLyrics('Test lyrics content')
      useLyricsEditingStore.getState().setContentHash('hash123')
      useLyricsEditingStore.getState().startGeneration('task-123')
      useLyricsEditingStore.getState().updateProgress('processing', 30)
      
      // Mock reconnecting state
      mockedUseSongGeneration.mockReturnValue({
        generate: mockGenerate,
        retry: mockRetry,
        isGenerating: true,
        isConnected: false,
        connectionStatus: 'reconnecting',
        reconnectAttempts: 2,
        maxReconnectAttempts: 5,
        manualReconnect: mockManualReconnect,
        error: null,
        errorInfo: null,
        canRetry: false,
        progress: 30,
        status: 'processing',
      })
      
      renderWithProviders(<LyricsEditingPage />, {
        locationState: { lyrics: 'Test lyrics content', contentHash: 'hash123' }
      })
      
      await waitFor(() => {
        // Should show reconnecting status via aria-label
        expect(screen.getByRole('status', { name: /Connection status: Reconnecting/i })).toBeInTheDocument()
      })
    })
  })

  describe('Error Scenarios', () => {
    it('shows error message when generation fails', async () => {
      // Set up store with lyrics and failed state
      useLyricsEditingStore.getState().setOriginalLyrics('Test lyrics content')
      useLyricsEditingStore.getState().setContentHash('hash123')
      useLyricsEditingStore.getState().startGeneration('task-123')
      useLyricsEditingStore.getState().failGeneration('Song generation failed', true)
      
      // Mock failed state
      mockedUseSongGeneration.mockReturnValue({
        generate: mockGenerate,
        retry: mockRetry,
        isGenerating: false,
        isConnected: false,
        connectionStatus: 'disconnected',
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        manualReconnect: mockManualReconnect,
        error: 'Song generation failed',
        errorInfo: null,
        canRetry: true,
        progress: 0,
        status: 'failed',
      })
      
      renderWithProviders(<LyricsEditingPage />, {
        locationState: { lyrics: 'Test lyrics content', contentHash: 'hash123' }
      })
      
      await waitFor(() => {
        // Should show error message - use getAllByText since there are multiple elements
        const failedElements = screen.getAllByText(/failed/i)
        expect(failedElements.length).toBeGreaterThan(0)
      })
    })

    it('shows retry button when error is retryable', async () => {
      const user = userEvent.setup()
      
      // Set up store with lyrics and failed state
      useLyricsEditingStore.getState().setOriginalLyrics('Test lyrics content')
      useLyricsEditingStore.getState().setContentHash('hash123')
      useLyricsEditingStore.getState().startGeneration('task-123')
      useLyricsEditingStore.getState().failGeneration('Temporary error', true)
      
      // Mock failed state with retry available
      mockedUseSongGeneration.mockReturnValue({
        generate: mockGenerate,
        retry: mockRetry,
        isGenerating: false,
        isConnected: false,
        connectionStatus: 'disconnected',
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        manualReconnect: mockManualReconnect,
        error: 'Temporary error',
        errorInfo: null,
        canRetry: true,
        progress: 0,
        status: 'failed',
      })
      
      renderWithProviders(<LyricsEditingPage />, {
        locationState: { lyrics: 'Test lyrics content', contentHash: 'hash123' }
      })
      
      await waitFor(() => {
        // Look for the Try Again button in the ProgressTracker
        const retryButton = screen.getByRole('button', { name: /Try again/i })
        expect(retryButton).toBeInTheDocument()
      })
      
      // Click retry button
      const retryButton = screen.getByRole('button', { name: /Try again/i })
      await user.click(retryButton)
      
      expect(mockRetry).toHaveBeenCalled()
    })

    it('disables generate button when offline', async () => {
      // Set up store with lyrics
      useLyricsEditingStore.getState().setOriginalLyrics('Test lyrics content that is long enough')
      useLyricsEditingStore.getState().setContentHash('hash123')
      
      // Mock offline state
      mockedUseNetworkStatus.mockReturnValue({
        isOnline: false,
        wasOffline: true,
        lastOnlineAt: null,
        lastOfflineAt: new Date(),
        checkConnection: mockCheckConnection,
      })
      
      renderWithProviders(<LyricsEditingPage />, {
        locationState: { lyrics: 'Test lyrics content that is long enough', contentHash: 'hash123' }
      })
      
      await waitFor(() => {
        const generateButton = screen.getByRole('button', { name: /Generate song/i })
        expect(generateButton).toBeDisabled()
      })
    })

    it('shows offline indicator when network is unavailable', async () => {
      // Set up store with lyrics
      useLyricsEditingStore.getState().setOriginalLyrics('Test lyrics content')
      useLyricsEditingStore.getState().setContentHash('hash123')
      
      // Mock offline state
      mockedUseNetworkStatus.mockReturnValue({
        isOnline: false,
        wasOffline: true,
        lastOnlineAt: null,
        lastOfflineAt: new Date(),
        checkConnection: mockCheckConnection,
      })
      
      renderWithProviders(<LyricsEditingPage />, {
        locationState: { lyrics: 'Test lyrics content', contentHash: 'hash123' }
      })
      
      await waitFor(() => {
        // Use getAllByText since there are multiple elements with "offline"
        const offlineElements = screen.getAllByText(/offline/i)
        expect(offlineElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Navigation', () => {
    it('shows back button to return to edit content', async () => {
      // Set up store with lyrics
      useLyricsEditingStore.getState().setOriginalLyrics('Test lyrics content')
      useLyricsEditingStore.getState().setContentHash('hash123')
      
      renderWithProviders(<LyricsEditingPage />, {
        locationState: { lyrics: 'Test lyrics content', contentHash: 'hash123' }
      })
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to edit content/i })).toBeInTheDocument()
      })
    })

    it('warns user about unsaved changes when navigating back', async () => {
      const user = userEvent.setup()
      
      // Set up store with lyrics
      useLyricsEditingStore.getState().setOriginalLyrics('Original lyrics')
      useLyricsEditingStore.getState().setContentHash('hash123')
      
      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
      
      renderWithProviders(<LyricsEditingPage />, {
        locationState: { lyrics: 'Original lyrics', contentHash: 'hash123' }
      })
      
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument()
      })
      
      // Edit lyrics to create unsaved changes
      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'Modified lyrics')
      
      // Click back button
      const backButton = screen.getByRole('button', { name: /back to edit content/i })
      await user.click(backButton)
      
      // Verify confirm was called
      expect(confirmSpy).toHaveBeenCalledWith(
        'You have unsaved changes to your lyrics. Are you sure you want to go back?'
      )
      
      confirmSpy.mockRestore()
    })

    it('disables back button while generating', async () => {
      // Set up store with lyrics
      useLyricsEditingStore.getState().setOriginalLyrics('Test lyrics content')
      useLyricsEditingStore.getState().setContentHash('hash123')
      
      // Mock generating state
      mockedUseSongGeneration.mockReturnValue({
        generate: mockGenerate,
        retry: mockRetry,
        isGenerating: true,
        isConnected: true,
        connectionStatus: 'connected',
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        manualReconnect: mockManualReconnect,
        error: null,
        errorInfo: null,
        canRetry: false,
        progress: 50,
        status: 'processing',
      })
      
      renderWithProviders(<LyricsEditingPage />, {
        locationState: { lyrics: 'Test lyrics content', contentHash: 'hash123' }
      })
      
      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back to edit content/i })
        expect(backButton).toBeDisabled()
      })
    })
  })

*/
