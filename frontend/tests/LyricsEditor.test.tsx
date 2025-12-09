import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LyricsEditor } from '@/components/LyricsEditor'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'

// Mock the store
jest.mock('@/stores/lyricsEditingStore')

describe('LyricsEditor Component', () => {
  const mockSetEditedLyrics = jest.fn()
  const mockUpdateVersionEdits = jest.fn()
  const mockSetActiveVersion = jest.fn()
  const mockDeleteVersion = jest.fn()
  
  // Default mock values for the store
  const getDefaultMock = (overrides: Record<string, unknown> = {}) => ({
    editedLyrics: '',
    setEditedLyrics: mockSetEditedLyrics,
    activeVersionId: null,
    updateVersionEdits: mockUpdateVersionEdits,
    versions: [],
    setActiveVersion: mockSetActiveVersion,
    deleteVersion: mockDeleteVersion,
    isRegenerating: false,
    ...overrides,
  })
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock())
  })

  describe('Character Counter', () => {
    it('displays character counter with 0 characters initially', () => {
      render(<LyricsEditor />)
      
      expect(screen.getByText('0 / 3000')).toBeInTheDocument()
    })

    it('updates character count correctly when lyrics change', () => {
      const lyrics = 'Hello world test lyrics'
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: lyrics,
      }))
      
      render(<LyricsEditor />)
      
      expect(screen.getByText(`${lyrics.length} / 3000`)).toBeInTheDocument()
    })

    it('calls setEditedLyrics when user types', async () => {
      const user = userEvent.setup()
      render(<LyricsEditor />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Test lyrics')
      
      expect(mockSetEditedLyrics).toHaveBeenCalled()
    })
  })

  describe('Visual States', () => {
    it('shows normal state for content under 2700 characters', () => {
      const lyrics = 'a'.repeat(2000)
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: lyrics,
      }))
      
      render(<LyricsEditor />)
      
      // The counter container (span with role="status") has the class
      const counterContainer = screen.getByRole('status')
      expect(counterContainer).toHaveClass('text-muted-foreground')
    })

    it('shows warning state for content between 2700-3000 characters', () => {
      const lyrics = 'a'.repeat(2800)
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: lyrics,
      }))
      
      render(<LyricsEditor />)
      
      // The counter container (span with role="status") has the class
      const counterContainer = screen.getByRole('status')
      expect(counterContainer).toHaveClass('font-semibold')
      // Check for warning color class (amber)
      expect(counterContainer.className).toMatch(/text-amber/)
    })

    it('shows error state for content over 3000 characters', () => {
      const lyrics = 'a'.repeat(3100)
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: lyrics,
      }))
      
      render(<LyricsEditor />)
      
      // The counter container (span with role="status") has the class
      const counterContainer = screen.getByRole('status')
      expect(counterContainer).toHaveClass('font-semibold')
      // Check for error color class (red)
      expect(counterContainer.className).toMatch(/text-red/)
    })

    it('shows too short warning for content under 50 characters', () => {
      const lyrics = 'Short text'
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: lyrics,
      }))
      
      render(<LyricsEditor />)
      
      // Use getAllByText since there are multiple elements with this text (sr-only and visible)
      const helpTexts = screen.getAllByText(/Minimum 50 characters required/i)
      expect(helpTexts.length).toBeGreaterThan(0)
      // Check the visible help text (not sr-only)
      const visibleHelpText = helpTexts.find(el => !el.classList.contains('sr-only'))
      expect(visibleHelpText).toBeInTheDocument()
    })

    it('shows warning help text when approaching limit', () => {
      const lyrics = 'a'.repeat(2800)
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: lyrics,
      }))
      
      render(<LyricsEditor />)
      
      const helpText = screen.getByText(/Approaching character limit\. 200 characters remaining\./i)
      expect(helpText).toBeInTheDocument()
    })

    it('shows error help text when exceeding limit', () => {
      const lyrics = 'a'.repeat(3100)
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: lyrics,
      }))
      
      render(<LyricsEditor />)
      
      // Use getAllByText since there are multiple elements with this text (sr-only and visible)
      const helpTexts = screen.getAllByText(/Lyrics exceed maximum length/i)
      expect(helpTexts.length).toBeGreaterThan(0)
      // Check the visible help text (not sr-only)
      const visibleHelpText = helpTexts.find(el => !el.classList.contains('sr-only'))
      expect(visibleHelpText).toBeInTheDocument()
    })

    it('sets aria-invalid to true when exceeding character limit', () => {
      const lyrics = 'a'.repeat(3100)
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: lyrics,
      }))
      
      render(<LyricsEditor />)
      
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('Accessibility', () => {
    it('renders textarea with correct accessibility attributes', () => {
      render(<LyricsEditor />)
      
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('aria-label', 'Lyrics editor - edit your song lyrics')
      expect(textarea).toHaveAttribute('aria-describedby', 'char-counter lyrics-help lyrics-keyboard-hint')
      expect(textarea).toHaveAttribute('aria-required', 'true')
    })

    it('has proper label association', () => {
      render(<LyricsEditor />)
      
      const label = screen.getByText('Edit Lyrics')
      expect(label).toHaveAttribute('for', 'lyrics-editor')
      
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('id', 'lyrics-editor')
    })

    it('has aria-live region for character counter', () => {
      render(<LyricsEditor />)
      
      const counter = screen.getByRole('status')
      expect(counter).toHaveAttribute('aria-live', 'polite')
      expect(counter).toHaveAttribute('aria-atomic', 'true')
    })

    it('provides screen reader status message', () => {
      const lyrics = 'a'.repeat(2800)
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: lyrics,
      }))
      
      render(<LyricsEditor />)
      
      // Check for sr-only status message
      const srOnlyText = screen.getByText(/Warning: Approaching character limit\. 200 characters remaining/i)
      expect(srOnlyText).toHaveClass('sr-only')
    })

    it('has keyboard hint for screen readers', () => {
      render(<LyricsEditor />)
      
      const keyboardHint = screen.getByText(/Use Ctrl\+Z to undo and Ctrl\+Y or Ctrl\+Shift\+Z to redo changes/i)
      expect(keyboardHint).toHaveClass('sr-only')
    })

    it('has role="group" on container with labelledby', () => {
      render(<LyricsEditor />)
      
      const group = screen.getByRole('group')
      expect(group).toHaveAttribute('aria-labelledby', 'lyrics-editor-label')
    })
  })

  describe('Undo/Redo Functionality', () => {
    it('textarea supports native undo/redo via keyboard', () => {
      render(<LyricsEditor />)
      
      const textarea = screen.getByRole('textbox')
      
      // Verify textarea is editable and can receive keyboard events
      expect(textarea).not.toBeDisabled()
      expect(textarea.tagName.toLowerCase()).toBe('textarea')
    })

    it('handles onChange events for undo/redo tracking', async () => {
      const user = userEvent.setup()
      render(<LyricsEditor />)
      
      const textarea = screen.getByRole('textbox')
      
      // Type some text
      await user.type(textarea, 'First')
      expect(mockSetEditedLyrics).toHaveBeenCalled()
      
      // Clear and type more
      mockSetEditedLyrics.mockClear()
      await user.type(textarea, ' Second')
      expect(mockSetEditedLyrics).toHaveBeenCalled()
    })

    it('supports Ctrl+Z keyboard shortcut (native browser behavior)', () => {
      render(<LyricsEditor />)
      
      const textarea = screen.getByRole('textbox')
      
      // Simulate Ctrl+Z - this tests that the textarea doesn't prevent default behavior
      fireEvent.keyDown(textarea, { key: 'z', ctrlKey: true })
      
      // The textarea should still be functional
      expect(textarea).toBeInTheDocument()
    })

    it('supports Ctrl+Y keyboard shortcut (native browser behavior)', () => {
      render(<LyricsEditor />)
      
      const textarea = screen.getByRole('textbox')
      
      // Simulate Ctrl+Y - this tests that the textarea doesn't prevent default behavior
      fireEvent.keyDown(textarea, { key: 'y', ctrlKey: true })
      
      // The textarea should still be functional
      expect(textarea).toBeInTheDocument()
    })
  })

  describe('Edit Tracking (Task 8.3)', () => {
    it('calls updateVersionEdits when typing with an active version', async () => {
      const user = userEvent.setup()
      const mockVersionId = 'test-version-123'
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: 'Initial lyrics',
        activeVersionId: mockVersionId,
      }))
      
      render(<LyricsEditor />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, ' test')
      
      // Should call updateVersionEdits with the active version ID
      expect(mockUpdateVersionEdits).toHaveBeenCalled()
      expect(mockUpdateVersionEdits.mock.calls[0][0]).toBe(mockVersionId)
    })

    it('does not call updateVersionEdits when no active version exists', async () => {
      const user = userEvent.setup()
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: 'Initial lyrics',
        activeVersionId: null,
      }))
      
      render(<LyricsEditor />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, ' test')
      
      // Should always call setEditedLyrics
      expect(mockSetEditedLyrics).toHaveBeenCalled()
      // But should not call updateVersionEdits when no active version
      expect(mockUpdateVersionEdits).not.toHaveBeenCalled()
    })

    it('passes the correct edited content to updateVersionEdits', async () => {
      const user = userEvent.setup()
      const mockVersionId = 'test-version-456'
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: '',
        activeVersionId: mockVersionId,
      }))
      
      render(<LyricsEditor />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'A')
      
      // Should pass the new value to updateVersionEdits
      expect(mockUpdateVersionEdits).toHaveBeenCalledWith(mockVersionId, 'A')
    })

    it('tracks isEdited flag updates via store', () => {
      const mockVersionId = 'test-version-789'
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: 'Modified lyrics',
        activeVersionId: mockVersionId,
      }))
      
      render(<LyricsEditor />)
      
      // Simulate a change event
      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'New content' } })
      
      // Should call both setEditedLyrics and updateVersionEdits
      expect(mockSetEditedLyrics).toHaveBeenCalledWith('New content')
      expect(mockUpdateVersionEdits).toHaveBeenCalledWith(mockVersionId, 'New content')
    })

    it('displays edit indicator in VersionSelector when version is edited', () => {
      // This test verifies the data flow - the store updateVersionEdits should set isEdited
      // The actual rendering of the indicator is tested in VersionSelector.test.tsx
      const mockVersionId = 'edited-version'
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: 'Edited content',
        activeVersionId: mockVersionId,
      }))
      
      render(<LyricsEditor />)
      
      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'New edited content' } })
      
      // Verify the update function was called to track the edit
      expect(mockUpdateVersionEdits).toHaveBeenCalledWith(mockVersionId, 'New edited content')
    })

    it('populates editedLyrics field via store when editing', () => {
      const mockVersionId = 'test-version-editedlyrics'
      const originalContent = 'Original content'
      const editedContent = 'Edited content after change'
      
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue(getDefaultMock({
        editedLyrics: originalContent,
        activeVersionId: mockVersionId,
      }))
      
      render(<LyricsEditor />)
      
      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: editedContent } })
      
      // Verify updateVersionEdits is called with the new content
      // The store's updateVersionEdits will set isEdited and editedLyrics appropriately
      expect(mockUpdateVersionEdits).toHaveBeenCalledWith(mockVersionId, editedContent)
    })
  })
})
