/**
 * Unit tests for SongSwitcher component
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { axe } from 'jest-axe'
import { SongSwitcher } from '@/components/SongSwitcher'
import type { SongVariation } from '@/api/songs'

// Type augmentation for jest-axe
declare module 'jest-axe' {
  interface Matchers<R> {
    toHaveNoViolations(): R
  }
}

describe('SongSwitcher Component', () => {
  const mockVariations: SongVariation[] = [
    {
      audio_url: 'https://example.com/song1.mp3',
      audio_id: 'audio-id-1',
      variation_index: 0,
    },
    {
      audio_url: 'https://example.com/song2.mp3',
      audio_id: 'audio-id-2',
      variation_index: 1,
    },
  ]

  describe('Rendering with 2 variations', () => {
    it('should render the component with both version buttons', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
        />
      )

      expect(screen.getByTestId('song-switcher')).toBeInTheDocument()
      expect(screen.getByLabelText(/Version 1/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Version 2/)).toBeInTheDocument()
    })

    it('should display the label "Song Version"', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
        />
      )

      expect(screen.getByText('Song Version')).toBeInTheDocument()
    })

    it('should display status text for currently playing version', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
        />
      )

      expect(screen.getByText('Currently playing Version 1')).toBeInTheDocument()
    })

    it('should update status text when activeIndex changes', () => {
      const { rerender } = render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
        />
      )

      expect(screen.getByText('Currently playing Version 1')).toBeInTheDocument()

      rerender(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={1}
          onSwitch={() => {}}
        />
      )

      expect(screen.getByText('Currently playing Version 2')).toBeInTheDocument()
    })
  })

  describe('Click handlers', () => {
    it('should call onSwitch with correct index when Version 1 is clicked', () => {
      const mockOnSwitch = jest.fn()
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={1}
          onSwitch={mockOnSwitch}
        />
      )

      const version1Button = screen.getByLabelText(/Version 1/)
      fireEvent.click(version1Button)

      expect(mockOnSwitch).toHaveBeenCalledWith(0)
      expect(mockOnSwitch).toHaveBeenCalledTimes(1)
    })

    it('should call onSwitch with correct index when Version 2 is clicked', () => {
      const mockOnSwitch = jest.fn()
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={mockOnSwitch}
        />
      )

      const version2Button = screen.getByLabelText(/Version 2/)
      fireEvent.click(version2Button)

      expect(mockOnSwitch).toHaveBeenCalledWith(1)
      expect(mockOnSwitch).toHaveBeenCalledTimes(1)
    })

    it('should NOT call onSwitch when clicking the already active button', () => {
      const mockOnSwitch = jest.fn()
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={mockOnSwitch}
        />
      )

      const version1Button = screen.getByLabelText(/Version 1.*currently playing/)
      fireEvent.click(version1Button)

      // ToggleGroup doesn't trigger onChange when clicking already selected item
      expect(mockOnSwitch).not.toHaveBeenCalled()
    })
  })

  describe('Loading state display', () => {
    it('should display loading indicator when isLoading is true', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
          isLoading={true}
        />
      )

      // Check for loading spinner (Loader2 icon)
      const loadingIcon = document.querySelector('.animate-spin')
      expect(loadingIcon).toBeInTheDocument()
    })

    it('should display "Switching version..." text when loading', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
          isLoading={true}
        />
      )

      expect(screen.getByText('Switching version...')).toBeInTheDocument()
    })

    it('should NOT display loading indicator when isLoading is false', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
          isLoading={false}
        />
      )

      const loadingIcon = document.querySelector('.animate-spin')
      expect(loadingIcon).not.toBeInTheDocument()
    })

    it('should disable buttons when isLoading is true', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
          isLoading={true}
        />
      )

      const version1Button = screen.getByLabelText(/Version 1/)
      const version2Button = screen.getByLabelText(/Version 2/)

      expect(version1Button).toBeDisabled()
      expect(version2Button).toBeDisabled()
    })

    it('should NOT call onSwitch when buttons are clicked during loading', () => {
      const mockOnSwitch = jest.fn()
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={mockOnSwitch}
          isLoading={true}
        />
      )

      const version2Button = screen.getByLabelText(/Version 2/)
      fireEvent.click(version2Button)

      expect(mockOnSwitch).not.toHaveBeenCalled()
    })
  })

  describe('Disabled state', () => {
    it('should disable buttons when disabled prop is true', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
          disabled={true}
        />
      )

      const version1Button = screen.getByLabelText(/Version 1/)
      const version2Button = screen.getByLabelText(/Version 2/)

      expect(version1Button).toBeDisabled()
      expect(version2Button).toBeDisabled()
    })

    it('should NOT call onSwitch when buttons are clicked while disabled', () => {
      const mockOnSwitch = jest.fn()
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={mockOnSwitch}
          disabled={true}
        />
      )

      const version2Button = screen.getByLabelText(/Version 2/)
      fireEvent.click(version2Button)

      expect(mockOnSwitch).not.toHaveBeenCalled()
    })

    it('should enable buttons when disabled prop is false', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
          disabled={false}
        />
      )

      const version1Button = screen.getByLabelText(/Version 1/)
      const version2Button = screen.getByLabelText(/Version 2/)

      expect(version1Button).not.toBeDisabled()
      expect(version2Button).not.toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
        />
      )

      const switcher = screen.getByRole('group', { name: 'Song version switcher' })
      expect(switcher).toBeInTheDocument()
    })

    it('should have aria-live region for status updates', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
        />
      )

      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toHaveAttribute('aria-live', 'polite')
    })

    it('should have minimum touch target size (44x44px)', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
        />
      )

      const version1Button = screen.getByLabelText(/Version 1/)
      expect(version1Button).toHaveClass('min-h-[44px]')
      expect(version1Button).toHaveClass('min-w-[44px]')
    })

    it('should have no WCAG accessibility violations (axe-core)', async () => {
      const { container } = render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations when loading', async () => {
      const { container } = render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
          isLoading={true}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have no accessibility violations when disabled', async () => {
      const { container } = render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
          disabled={true}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support keyboard navigation with Tab key', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
        />
      )

      const version1Button = screen.getByLabelText(/Version 1/)
      const version2Button = screen.getByLabelText(/Version 2/)

      // Active button should be tabbable (tabIndex 0)
      expect(version1Button).toHaveAttribute('tabindex', '0')
      // Inactive button should not be in tab order (tabIndex -1)
      expect(version2Button).toHaveAttribute('tabindex', '-1')
    })

    it('should have visible focus indicators', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={0}
          onSwitch={() => {}}
        />
      )

      const version1Button = screen.getByLabelText(/Version 1/)
      
      // Check for focus-visible classes
      expect(version1Button).toHaveClass('focus-visible:ring-2')
      expect(version1Button).toHaveClass('focus-visible:ring-ring')
      expect(version1Button).toHaveClass('focus-visible:ring-offset-2')
    })
  })

  describe('Edge cases', () => {
    it('should not render when variations array is empty', () => {
      const { container } = render(
        <SongSwitcher variations={[]} activeIndex={0} onSwitch={() => {}} />
      )

      expect(container.querySelector('[data-testid="song-switcher"]')).not.toBeInTheDocument()
    })

    it('should not render when only one variation exists', () => {
      const singleVariation: SongVariation[] = [mockVariations[0]]
      const { container } = render(
        <SongSwitcher
          variations={singleVariation}
          activeIndex={0}
          onSwitch={() => {}}
        />
      )

      expect(container.querySelector('[data-testid="song-switcher"]')).not.toBeInTheDocument()
    })

    it('should handle activeIndex out of bounds gracefully', () => {
      render(
        <SongSwitcher
          variations={mockVariations}
          activeIndex={5}
          onSwitch={() => {}}
        />
      )

      // Component should still render without crashing
      expect(screen.getByTestId('song-switcher')).toBeInTheDocument()
    })
  })
})
