/**
 * Unit tests for version switching in LyricsEditor component
 *
 * Feature: lyrics-regeneration-versioning
 * Task 7.4: Unit tests for version switching
 *
 * Tests covered:
 * - Version switching between versions
 * - Edit preservation when switching
 * - Loading edited vs original lyrics
 * - Textarea content updates on switch
 *
 * Requirements: 2.2, 5.3, 5.4
 */

import * as React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LyricsEditor } from '@/components/LyricsEditor'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'

// Create a wrapper for components that need QueryClientProvider
const createQueryWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock the AlertDialog components
jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick: () => void
  }) => (
    <button onClick={onClick} data-testid="alert-dialog-action">
      {children}
    </button>
  ),
  AlertDialogCancel: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick: () => void
  }) => (
    <button onClick={onClick} data-testid="alert-dialog-cancel">
      {children}
    </button>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="alert-dialog-description">{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="alert-dialog-title">{children}</h2>
  ),
}))

// Helper to setup test with versions
const setupWithVersions = (lyricsArray: string[]) => {
  const { result } = renderHook(() => useLyricsEditingStore())

  // Reset and add versions
  act(() => {
    result.current.reset()
    lyricsArray.forEach((lyrics) => {
      result.current.addVersion(lyrics)
    })
  })

  return result
}

describe('Version Switching Unit Tests', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()

    // Reset store to initial state
    const { result } = renderHook(() => useLyricsEditingStore())
    act(() => {
      result.current.reset()
    })
  })

  describe('Switching between versions', () => {
    it('should switch to version 1 when version 1 tab is clicked', () => {
      const storeResult = setupWithVersions([
        'Version 1 lyrics content',
        'Version 2 lyrics content',
      ])

      const version1Id = storeResult.current.versions[0].id

      render(<LyricsEditor />, { wrapper: createQueryWrapper() })

      // Click version 1 tab
      const version1Tab = document.getElementById(`version-tab-${version1Id}`)
      expect(version1Tab).toBeInTheDocument()

      fireEvent.click(version1Tab!)

      // Verify the store's activeVersionId updated
      expect(storeResult.current.activeVersionId).toBe(version1Id)
    })

    it('should update textarea content when switching versions', async () => {
      const user = userEvent.setup()
      const storeResult = setupWithVersions(['First version lyrics', 'Second version lyrics'])

      const version1Id = storeResult.current.versions[0].id
      const version2Id = storeResult.current.versions[1].id

      render(<LyricsEditor />, { wrapper: createQueryWrapper() })

      // Initially should show version 2 (most recent)
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue('Second version lyrics')
      expect(storeResult.current.activeVersionId).toBe(version2Id)

      // Click version 1 tab using userEvent for more realistic interaction
      const version1Tab = document.getElementById(`version-tab-${version1Id}`)
      await user.click(version1Tab!)

      // Wait for the textarea value to update
      await waitFor(() => {
        const updatedTextarea = screen.getByRole('textbox')
        expect(updatedTextarea).toHaveValue('First version lyrics')
      }, { timeout: 5000 })
    })

    it('should highlight active version tab', () => {
      const storeResult = setupWithVersions(['Version A', 'Version B'])

      const version1Id = storeResult.current.versions[0].id
      const version2Id = storeResult.current.versions[1].id

      render(<LyricsEditor />, { wrapper: createQueryWrapper() })

      // Initially version 2 is active
      const version2Tab = document.getElementById(`version-tab-${version2Id}`)
      expect(version2Tab).toHaveAttribute('aria-selected', 'true')
      expect(version2Tab).toHaveClass('bg-primary')

      // Switch to version 1
      const version1Tab = document.getElementById(`version-tab-${version1Id}`)
      fireEvent.click(version1Tab!)

      // Version 1 should now be active
      expect(version1Tab).toHaveAttribute('aria-selected', 'true')
      expect(version1Tab).toHaveClass('bg-primary')

      // Version 2 should no longer be active
      expect(version2Tab).toHaveAttribute('aria-selected', 'false')
    })
  })

  describe('Edit preservation', () => {
    it('should preserve edits when switching away from version', () => {
      const storeResult = setupWithVersions(['Original version 1', 'Original version 2'])

      const version1Id = storeResult.current.versions[0].id

      render(<LyricsEditor />, { wrapper: createQueryWrapper() })

      const textarea = screen.getByRole('textbox')

      // Currently on version 2, edit it
      fireEvent.change(textarea, { target: { value: 'Modified version 2 content' } })

      // Switch to version 1
      const version1Tab = document.getElementById(`version-tab-${version1Id}`)
      fireEvent.click(version1Tab!)

      // Version 2 should have edits preserved in store
      const version2 = storeResult.current.versions.find((v) => v.id !== version1Id)
      expect(version2?.isEdited).toBe(true)
      expect(version2?.editedLyrics).toBe('Modified version 2 content')
    })

    it('should show edited content when switching back to edited version', () => {
      const storeResult = setupWithVersions(['Original version 1', 'Original version 2'])

      const version1Id = storeResult.current.versions[0].id
      const version2Id = storeResult.current.versions[1].id

      render(<LyricsEditor />, { wrapper: createQueryWrapper() })

      const textarea = screen.getByRole('textbox')

      // Currently on version 2, edit it
      fireEvent.change(textarea, { target: { value: 'Modified version 2 content' } })

      // Switch to version 1
      const version1Tab = document.getElementById(`version-tab-${version1Id}`)
      fireEvent.click(version1Tab!)

      // Switch back to version 2
      const version2Tab = document.getElementById(`version-tab-${version2Id}`)
      fireEvent.click(version2Tab!)

      // Should show the edited content
      expect(textarea).toHaveValue('Modified version 2 content')
    })

    it('should not mark version as edited when content matches original', () => {
      const storeResult = setupWithVersions(['Version 1 content', 'Version 2 content'])

      const version1Id = storeResult.current.versions[0].id
      const version2Id = storeResult.current.versions[1].id

      render(<LyricsEditor />, { wrapper: createQueryWrapper() })

      const textarea = screen.getByRole('textbox')

      // Currently on version 2, type and then undo (or retype same value)
      fireEvent.change(textarea, { target: { value: 'Version 2 content' } })

      // Switch to version 1
      const version1Tab = document.getElementById(`version-tab-${version1Id}`)
      fireEvent.click(version1Tab!)

      // Version 2 should NOT be marked as edited since content matches original
      const version2 = storeResult.current.versions.find((v) => v.id === version2Id)
      expect(version2?.isEdited).toBe(false)
    })
  })

  describe('Loading edited vs original lyrics', () => {
    it('should load original lyrics for unedited version', () => {
      const storeResult = setupWithVersions(['First original', 'Second original'])

      const version1Id = storeResult.current.versions[0].id

      render(<LyricsEditor />, { wrapper: createQueryWrapper() })

      // Switch to version 1 (unedited)
      const version1Tab = document.getElementById(`version-tab-${version1Id}`)
      fireEvent.click(version1Tab!)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue('First original')
    })

    it('should load edited lyrics for edited version', () => {
      const storeResult = setupWithVersions(['Original first', 'Original second'])

      const version1Id = storeResult.current.versions[0].id

      // Pre-edit version 1 in the store
      act(() => {
        storeResult.current.updateVersionEdits(version1Id, 'Modified first content')
      })

      render(<LyricsEditor />, { wrapper: createQueryWrapper() })

      // Switch to version 1 (edited)
      const version1Tab = document.getElementById(`version-tab-${version1Id}`)
      fireEvent.click(version1Tab!)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue('Modified first content')
    })

    it('should update both editedLyrics and originalLyrics on switch', () => {
      const storeResult = setupWithVersions(['First version', 'Second version'])

      const version1Id = storeResult.current.versions[0].id

      // Switch to version 1
      act(() => {
        storeResult.current.setActiveVersion(version1Id)
      })

      expect(storeResult.current.editedLyrics).toBe('First version')
      expect(storeResult.current.originalLyrics).toBe('First version')
    })
  })

  describe('Store state synchronization', () => {
    it('should synchronize activeVersionId with VersionSelector', () => {
      const storeResult = setupWithVersions(['Version A', 'Version B', 'Version C'])

      const version1Id = storeResult.current.versions[0].id
      const version2Id = storeResult.current.versions[1].id
      const version3Id = storeResult.current.versions[2].id

      render(<LyricsEditor />, { wrapper: createQueryWrapper() })

      // Initially version 3 is active
      expect(storeResult.current.activeVersionId).toBe(version3Id)

      // Click version 1
      fireEvent.click(document.getElementById(`version-tab-${version1Id}`)!)
      expect(storeResult.current.activeVersionId).toBe(version1Id)

      // Click version 2
      fireEvent.click(document.getElementById(`version-tab-${version2Id}`)!)
      expect(storeResult.current.activeVersionId).toBe(version2Id)

      // Click version 3
      fireEvent.click(document.getElementById(`version-tab-${version3Id}`)!)
      expect(storeResult.current.activeVersionId).toBe(version3Id)
    })

    it('should disable version selector when isRegenerating is true', () => {
      const storeResult = setupWithVersions(['Version 1', 'Version 2'])

      // Set regenerating state
      act(() => {
        storeResult.current.startRegeneration()
      })

      render(<LyricsEditor />, { wrapper: createQueryWrapper() })

      // Version tabs should be disabled
      const tabs = screen.getAllByRole('tab')
      tabs.forEach((tab) => {
        expect(tab).toBeDisabled()
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle rapid version switching correctly', () => {
      const storeResult = setupWithVersions(['V1 content', 'V2 content', 'V3 content'])

      const version1Id = storeResult.current.versions[0].id
      const version2Id = storeResult.current.versions[1].id
      const version3Id = storeResult.current.versions[2].id

      render(<LyricsEditor />, { wrapper: createQueryWrapper() })

      // Rapid switching
      fireEvent.click(document.getElementById(`version-tab-${version1Id}`)!)
      fireEvent.click(document.getElementById(`version-tab-${version2Id}`)!)
      fireEvent.click(document.getElementById(`version-tab-${version3Id}`)!)
      fireEvent.click(document.getElementById(`version-tab-${version1Id}`)!)

      // Should end up on version 1
      expect(storeResult.current.activeVersionId).toBe(version1Id)
      expect(screen.getByRole('textbox')).toHaveValue('V1 content')
    })

    it('should handle switching with empty lyrics', () => {
      const storeResult = setupWithVersions([' ', 'Non-empty lyrics'])

      const version1Id = storeResult.current.versions[0].id
      const version2Id = storeResult.current.versions[1].id

      render(<LyricsEditor />, { wrapper: createQueryWrapper() })

      // Switch to version 1 (with whitespace only)
      fireEvent.click(document.getElementById(`version-tab-${version1Id}`)!)

      expect(storeResult.current.activeVersionId).toBe(version1Id)
      expect(screen.getByRole('textbox')).toHaveValue(' ')

      // Switch back to version 2
      fireEvent.click(document.getElementById(`version-tab-${version2Id}`)!)

      expect(storeResult.current.activeVersionId).toBe(version2Id)
      expect(screen.getByRole('textbox')).toHaveValue('Non-empty lyrics')
    })
  })
})
