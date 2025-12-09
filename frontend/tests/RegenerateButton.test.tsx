import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegenerateButton } from '@/components/RegenerateButton'

describe('RegenerateButton Component', () => {
  const mockOnRegenerate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Disabled States', () => {
    it('is disabled when regenerating (Requirements: 1.2)', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={true}
          hasUnsavedEdits={false}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(screen.getByText('Regenerating...')).toBeInTheDocument()
    })

    it('is disabled when rate limit is reached (Requirements: 7.2)', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={false}
          isRateLimited={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(screen.getByText(/Daily regeneration limit reached/i)).toBeInTheDocument()
    })

    it('is disabled when offline', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={false}
          isOffline={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(screen.getByText(/You are offline/i)).toBeInTheDocument()
    })

    it('is enabled when all conditions are met', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={false}
        />
      )

      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })
  })

  describe('Click Behavior', () => {
    it('calls onRegenerate when button is clicked without unsaved edits', async () => {
      const user = userEvent.setup()
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={false}
        />
      )

      const button = screen.getByRole('button')
      await user.click(button)

      expect(mockOnRegenerate).toHaveBeenCalledTimes(1)
    })

    it('does not call onRegenerate when button is disabled', async () => {
      const user = userEvent.setup()
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={true}
          hasUnsavedEdits={false}
        />
      )

      const button = screen.getByRole('button')
      await user.click(button)

      expect(mockOnRegenerate).not.toHaveBeenCalled()
    })
  })

  describe('Confirmation Dialog (Requirements: 1.5)', () => {
    it('shows confirmation dialog when clicking with unsaved edits', async () => {
      const user = userEvent.setup()
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={true}
        />
      )

      const button = screen.getByRole('button')
      await user.click(button)

      // Dialog should appear
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
      expect(screen.getByText(/You have unsaved edits/i)).toBeInTheDocument()
      expect(mockOnRegenerate).not.toHaveBeenCalled()
    })

    it('calls onRegenerate when confirming in dialog', async () => {
      const user = userEvent.setup()
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={true}
        />
      )

      // Open dialog
      const button = screen.getByRole('button', { name: /Regenerate lyrics/i })
      await user.click(button)

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: /Regenerate/i })
      await user.click(confirmButton)

      expect(mockOnRegenerate).toHaveBeenCalledTimes(1)
    })

    it('does not call onRegenerate when canceling in dialog', async () => {
      const user = userEvent.setup()
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={true}
        />
      )

      // Open dialog
      const button = screen.getByRole('button', { name: /Regenerate lyrics/i })
      await user.click(button)

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnRegenerate).not.toHaveBeenCalled()
    })

    it('closes dialog when canceling', async () => {
      const user = userEvent.setup()
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={true}
        />
      )

      // Open dialog
      const button = screen.getByRole('button', { name: /Regenerate lyrics/i })
      await user.click(button)

      // Verify dialog is open
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await user.click(cancelButton)

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Shortcut', () => {
    it('triggers onRegenerate on Ctrl+R when enabled and no unsaved edits', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={false}
        />
      )

      fireEvent.keyDown(window, { key: 'r', ctrlKey: true })

      expect(mockOnRegenerate).toHaveBeenCalledTimes(1)
    })

    it('triggers onRegenerate on Meta+R (Mac) when enabled and no unsaved edits', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={false}
        />
      )

      fireEvent.keyDown(window, { key: 'r', metaKey: true })

      expect(mockOnRegenerate).toHaveBeenCalledTimes(1)
    })

    it('does not trigger onRegenerate on Ctrl+R when disabled', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={true}
          hasUnsavedEdits={false}
        />
      )

      fireEvent.keyDown(window, { key: 'r', ctrlKey: true })

      expect(mockOnRegenerate).not.toHaveBeenCalled()
    })

    it('shows confirmation dialog on Ctrl+R when there are unsaved edits', async () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={true}
        />
      )

      fireEvent.keyDown(window, { key: 'r', ctrlKey: true })

      // Dialog should appear
      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
      })
      expect(mockOnRegenerate).not.toHaveBeenCalled()
    })

    it('shows keyboard shortcut hint', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={false}
        />
      )

      expect(screen.getByText(/Ctrl\+R/i)).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when regenerating', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={true}
          hasUnsavedEdits={false}
        />
      )

      expect(screen.getByText('Regenerating...')).toBeInTheDocument()
    })

    it('has aria-busy attribute when regenerating', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={true}
          hasUnsavedEdits={false}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
    })

    it('shows progress message when regenerating', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={true}
          hasUnsavedEdits={false}
        />
      )

      expect(screen.getByText(/Creating new lyrics version/i)).toBeInTheDocument()
    })

    it('shows normal button text when not regenerating', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={false}
        />
      )

      expect(screen.getByText('Regenerate Lyrics')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper aria-label when enabled', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={false}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Regenerate lyrics'))
    })

    it('has proper aria-label when disabled due to rate limit', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={false}
          isRateLimited={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('disabled'))
    })

    it('has proper aria-label when regenerating', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={true}
          hasUnsavedEdits={false}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Regenerating lyrics, please wait'))
    })

    it('has aria-describedby pointing to description', () => {
      render(
        <RegenerateButton
          onRegenerate={mockOnRegenerate}
          isRegenerating={false}
          hasUnsavedEdits={false}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-describedby', 'regenerate-button-description')
    })
  })
})
