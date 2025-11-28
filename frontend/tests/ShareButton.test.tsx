import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareButton } from '@/components/ShareButton'
import { useSongPlaybackStore } from '@/stores/songPlaybackStore'
import { toast } from 'sonner'

// Mock the store
jest.mock('@/stores/songPlaybackStore')

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock clipboard API
const mockWriteText = jest.fn()

describe('ShareButton Component', () => {
  const mockCreateShareLink = jest.fn()
  const mockOnShareSuccess = jest.fn()
  const mockOnShareError = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockWriteText.mockResolvedValue(undefined)
    
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    })

    // Default mock: not sharing
    ;(useSongPlaybackStore as unknown as jest.Mock).mockReturnValue({
      createShareLink: mockCreateShareLink,
      isSharing: false,
    })
  })

  describe('Share Link Creation', () => {
    it('calls createShareLink when clicked', async () => {
      const shareUrl = 'https://example.com/shared/abc123'
      mockCreateShareLink.mockResolvedValue(shareUrl)

      const user = userEvent.setup()
      render(<ShareButton songId="song-123" />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(mockCreateShareLink).toHaveBeenCalledTimes(1)
    })

    it('calls onShareSuccess callback with share URL', async () => {
      const shareUrl = 'https://example.com/shared/abc123'
      mockCreateShareLink.mockResolvedValue(shareUrl)

      const user = userEvent.setup()
      render(
        <ShareButton
          songId="song-123"
          onShareSuccess={mockOnShareSuccess}
        />
      )

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(mockOnShareSuccess).toHaveBeenCalledWith(shareUrl)
      })
    })

    it('does not call createShareLink when songId is empty', async () => {
      const user = userEvent.setup()
      render(<ShareButton songId="" />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(mockCreateShareLink).not.toHaveBeenCalled()
    })
  })

  describe('Clipboard Copy', () => {
    it('copies share URL to clipboard and shows success', async () => {
      const shareUrl = 'https://example.com/shared/abc123'
      mockCreateShareLink.mockResolvedValue(shareUrl)

      const user = userEvent.setup()
      render(<ShareButton songId="song-123" />)

      const button = screen.getByRole('button')
      await user.click(button)

      // Verify success state is shown (indicates clipboard copy succeeded)
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument()
      })
      
      // Verify success toast was called
      expect(toast.success).toHaveBeenCalledWith(
        'Link copied!',
        expect.objectContaining({
          description: 'Share link has been copied to clipboard',
        })
      )
    })
  })

  describe('Success Notification', () => {
    it('shows success toast after sharing', async () => {
      const shareUrl = 'https://example.com/shared/abc123'
      mockCreateShareLink.mockResolvedValue(shareUrl)

      const user = userEvent.setup()
      render(<ShareButton songId="song-123" />)

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Link copied!',
          expect.objectContaining({
            description: 'Share link has been copied to clipboard',
          })
        )
      })
    })

    it('shows "Copied!" text after successful share', async () => {
      const shareUrl = 'https://example.com/shared/abc123'
      mockCreateShareLink.mockResolvedValue(shareUrl)

      const user = userEvent.setup()
      render(<ShareButton songId="song-123" />)

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error toast when share fails', async () => {
      mockCreateShareLink.mockRejectedValue(new Error('Network error'))

      const user = userEvent.setup()
      render(<ShareButton songId="song-123" />)

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Share failed',
          expect.objectContaining({
            description: 'Unable to create share link. Please try again.',
          })
        )
      })
    })

    it('calls onShareError callback when share fails', async () => {
      const error = new Error('Network error')
      mockCreateShareLink.mockRejectedValue(error)

      const user = userEvent.setup()
      render(
        <ShareButton
          songId="song-123"
          onShareError={mockOnShareError}
        />
      )

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(mockOnShareError).toHaveBeenCalledWith(error)
      })
    })

    it('handles non-Error exceptions', async () => {
      mockCreateShareLink.mockRejectedValue('String error')

      const user = userEvent.setup()
      render(
        <ShareButton
          songId="song-123"
          onShareError={mockOnShareError}
        />
      )

      const button = screen.getByRole('button')
      await user.click(button)

      await waitFor(() => {
        expect(mockOnShareError).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Failed to create share link' })
        )
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when sharing', () => {
      ;(useSongPlaybackStore as unknown as jest.Mock).mockReturnValue({
        createShareLink: mockCreateShareLink,
        isSharing: true,
      })

      render(<ShareButton songId="song-123" />)

      expect(screen.getByText('Sharing...')).toBeInTheDocument()
    })

    it('is disabled when sharing', () => {
      ;(useSongPlaybackStore as unknown as jest.Mock).mockReturnValue({
        createShareLink: mockCreateShareLink,
        isSharing: true,
      })

      render(<ShareButton songId="song-123" />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('has aria-busy attribute when sharing', () => {
      ;(useSongPlaybackStore as unknown as jest.Mock).mockReturnValue({
        createShareLink: mockCreateShareLink,
        isSharing: true,
      })

      render(<ShareButton songId="song-123" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('Disabled State', () => {
    it('is disabled when disabled prop is true', () => {
      render(<ShareButton songId="song-123" disabled={true} />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('is disabled when songId is empty', () => {
      render(<ShareButton songId="" />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has proper aria-label when enabled', () => {
      render(<ShareButton songId="song-123" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Share this song')
    })

    it('has proper aria-label when sharing', () => {
      ;(useSongPlaybackStore as unknown as jest.Mock).mockReturnValue({
        createShareLink: mockCreateShareLink,
        isSharing: true,
      })

      render(<ShareButton songId="song-123" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Creating share link, please wait')
    })

    it('shows Share text when not sharing', () => {
      render(<ShareButton songId="song-123" />)

      expect(screen.getByText('Share')).toBeInTheDocument()
    })
  })
})
