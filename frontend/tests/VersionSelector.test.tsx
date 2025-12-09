/**
 * Unit tests for VersionSelector component
 * 
 * Feature: lyrics-regeneration-versioning, Task 6.4
 * Tests: Rendering, selection, deletion, highlighting, conditional rendering, edit indicators
 * Requirements: 2.1, 2.2, 2.5, 3.1, 5.2, 6.1
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { VersionSelector, type VersionSelectorProps } from '@/components/VersionSelector'
import type { LyricsVersion } from '@/stores/lyricsEditingStore'

// Helper to create mock versions
const createMockVersion = (
  id: string,
  lyrics: string,
  minutesAgo: number = 0,
  isEdited: boolean = false,
  editedLyrics?: string
): LyricsVersion => ({
  id,
  lyrics,
  createdAt: new Date(Date.now() - minutesAgo * 60 * 1000),
  isEdited,
  editedLyrics,
})

describe('VersionSelector Component', () => {
  const mockOnVersionSelect = jest.fn()
  const mockOnVersionDelete = jest.fn()

  const defaultProps: VersionSelectorProps = {
    versions: [
      createMockVersion('v1', 'First lyrics', 30),
      createMockVersion('v2', 'Second lyrics', 10),
    ],
    activeVersionId: 'v1',
    onVersionSelect: mockOnVersionSelect,
    onVersionDelete: mockOnVersionDelete,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Conditional Rendering', () => {
    it('should not render when there are no versions', () => {
      render(
        <VersionSelector
          {...defaultProps}
          versions={[]}
        />
      )

      expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    })

    it('should not render when there is only one version', () => {
      render(
        <VersionSelector
          {...defaultProps}
          versions={[createMockVersion('v1', 'Only lyrics', 5)]}
        />
      )

      expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    })

    it('should render when there are multiple versions', () => {
      render(<VersionSelector {...defaultProps} />)

      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })
  })

  describe('Rendering with Multiple Versions', () => {
    it('should render version tabs for each version', () => {
      render(<VersionSelector {...defaultProps} />)

      expect(screen.getByRole('tab', { name: /V1/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /V2/i })).toBeInTheDocument()
    })

    it('should display "Versions:" label', () => {
      render(<VersionSelector {...defaultProps} />)

      expect(screen.getByText('Versions:')).toBeInTheDocument()
    })

    it('should render versions in chronological order (oldest first)', () => {
      const versions = [
        createMockVersion('v-new', 'New lyrics', 5),  // 5 minutes ago
        createMockVersion('v-old', 'Old lyrics', 60), // 60 minutes ago
      ]

      render(
        <VersionSelector
          {...defaultProps}
          versions={versions}
          activeVersionId="v-old"
        />
      )

      const tabs = screen.getAllByRole('tab')
      // First tab should be V1 (oldest - v-old - 60 min ago)
      expect(tabs[0]).toHaveTextContent('V1')
      // Second tab should be V2 (newest - v-new - 5 min ago)
      expect(tabs[1]).toHaveTextContent('V2')
    })

    it('should render delete buttons for each version', () => {
      render(<VersionSelector {...defaultProps} />)

      expect(screen.getByTestId('delete-version-v1')).toBeInTheDocument()
      expect(screen.getByTestId('delete-version-v2')).toBeInTheDocument()
    })
  })

  describe('Active Version Highlighting (Requirements: 3.4)', () => {
    it('should highlight active version with aria-selected=true', () => {
      render(<VersionSelector {...defaultProps} />)

      const activeTab = screen.getByRole('tab', { name: /V1/i })
      const inactiveTab = screen.getByRole('tab', { name: /V2/i })

      expect(activeTab).toHaveAttribute('aria-selected', 'true')
      expect(inactiveTab).toHaveAttribute('aria-selected', 'false')
    })

    it('should apply primary styles to active version', () => {
      render(<VersionSelector {...defaultProps} />)

      const activeTab = screen.getByRole('tab', { name: /V1/i })
      expect(activeTab).toHaveClass('bg-primary')
      expect(activeTab).toHaveClass('text-primary-foreground')
    })

    it('should apply muted styles to inactive versions', () => {
      render(<VersionSelector {...defaultProps} />)

      const inactiveTab = screen.getByRole('tab', { name: /V2/i })
      expect(inactiveTab).toHaveClass('bg-muted')
      expect(inactiveTab).toHaveClass('text-muted-foreground')
    })
  })

  describe('Version Selection (Requirements: 2.2)', () => {
    it('should call onVersionSelect when clicking a version', () => {
      render(<VersionSelector {...defaultProps} />)

      const inactiveTab = screen.getByRole('tab', { name: /V2/i })
      fireEvent.click(inactiveTab)

      expect(mockOnVersionSelect).toHaveBeenCalledWith('v2')
      expect(mockOnVersionSelect).toHaveBeenCalledTimes(1)
    })

    it('should call onVersionSelect even when clicking active version', () => {
      render(<VersionSelector {...defaultProps} />)

      const activeTab = screen.getByRole('tab', { name: /V1/i })
      fireEvent.click(activeTab)

      expect(mockOnVersionSelect).toHaveBeenCalledWith('v1')
    })

    it('should not call onVersionSelect when disabled', () => {
      render(<VersionSelector {...defaultProps} disabled />)

      const tab = screen.getByRole('tab', { name: /V2/i })
      fireEvent.click(tab)

      // Button is disabled, so click won't work
      expect(tab).toBeDisabled()
    })
  })

  describe('Version Deletion (Requirements: 6.1)', () => {
    it('should call onVersionDelete when clicking delete button', () => {
      render(<VersionSelector {...defaultProps} />)

      const deleteBtn = screen.getByTestId('delete-version-v1')
      fireEvent.click(deleteBtn)

      expect(mockOnVersionDelete).toHaveBeenCalledWith('v1')
      expect(mockOnVersionDelete).toHaveBeenCalledTimes(1)
    })

    it('should not call onVersionDelete when disabled', () => {
      render(<VersionSelector {...defaultProps} disabled />)

      const deleteBtn = screen.getByTestId('delete-version-v1')
      expect(deleteBtn).toBeDisabled()
    })

    it('should have accessible delete button labels', () => {
      render(<VersionSelector {...defaultProps} />)

      // V1 is the oldest version (30 min ago), so it gets version number 1
      expect(screen.getByLabelText('Delete version 1')).toBeInTheDocument()
      // V2 is newer (10 min ago), so it gets version number 2
      expect(screen.getByLabelText('Delete version 2')).toBeInTheDocument()
    })
  })

  describe('Edit Indicator Display (Requirements: 5.2)', () => {
    it('should show edit indicator for edited versions', () => {
      const versions = [
        createMockVersion('v1', 'First lyrics', 30, true, 'Edited lyrics'),
        createMockVersion('v2', 'Second lyrics', 10, false),
      ]

      render(
        <VersionSelector
          {...defaultProps}
          versions={versions}
        />
      )

      expect(screen.getByTestId('edit-indicator-v1')).toBeInTheDocument()
      expect(screen.queryByTestId('edit-indicator-v2')).not.toBeInTheDocument()
    })

    it('should not show edit indicator for non-edited versions', () => {
      render(<VersionSelector {...defaultProps} />)

      expect(screen.queryByTestId('edit-indicator-v1')).not.toBeInTheDocument()
      expect(screen.queryByTestId('edit-indicator-v2')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label on tablist', () => {
      render(<VersionSelector {...defaultProps} />)

      expect(screen.getByRole('tablist')).toHaveAttribute(
        'aria-label',
        'Lyrics version selector'
      )
    })

    it('should have aria-live for announcements', () => {
      render(<VersionSelector {...defaultProps} />)

      expect(screen.getByRole('tablist')).toHaveAttribute('aria-live', 'polite')
    })

    it('should have proper role attributes on version buttons', () => {
      render(<VersionSelector {...defaultProps} />)

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(2)
    })

    it('should have unique ids for each version tab', () => {
      render(<VersionSelector {...defaultProps} />)

      expect(screen.getByRole('tab', { name: /V1/i })).toHaveAttribute(
        'id',
        'version-tab-v1'
      )
      expect(screen.getByRole('tab', { name: /V2/i })).toHaveAttribute(
        'id',
        'version-tab-v2'
      )
    })
  })

  describe('Disabled State', () => {
    it('should apply disabled styles when disabled', () => {
      render(<VersionSelector {...defaultProps} disabled />)

      const tabs = screen.getAllByRole('tab')
      tabs.forEach((tab) => {
        expect(tab).toBeDisabled()
        expect(tab).toHaveClass('opacity-50')
        expect(tab).toHaveClass('cursor-not-allowed')
      })
    })

    it('should disable delete buttons when disabled', () => {
      render(<VersionSelector {...defaultProps} disabled />)

      expect(screen.getByTestId('delete-version-v1')).toBeDisabled()
      expect(screen.getByTestId('delete-version-v2')).toBeDisabled()
    })
  })

  describe('Many Versions', () => {
    it('should handle many versions correctly', () => {
      const manyVersions = Array.from({ length: 8 }, (_, i) =>
        createMockVersion(`v${i + 1}`, `Lyrics ${i + 1}`, (8 - i) * 10)
      )

      render(
        <VersionSelector
          {...defaultProps}
          versions={manyVersions}
          activeVersionId="v1"
        />
      )

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(8)
    })

    it('should correctly number versions chronologically', () => {
      const versions = [
        createMockVersion('newest', 'Newest lyrics', 5),
        createMockVersion('oldest', 'Oldest lyrics', 120),
        createMockVersion('middle', 'Middle lyrics', 30),
      ]

      render(
        <VersionSelector
          {...defaultProps}
          versions={versions}
          activeVersionId="oldest"
        />
      )

      const tabs = screen.getAllByRole('tab')
      // Chronological order: oldest (120 min ago), middle (30 min ago), newest (5 min ago)
      expect(tabs[0]).toHaveTextContent('V1') // oldest
      expect(tabs[1]).toHaveTextContent('V2') // middle
      expect(tabs[2]).toHaveTextContent('V3') // newest
    })
  })
})
