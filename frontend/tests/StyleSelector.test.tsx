import { render, screen } from '@testing-library/react'
import { StyleSelector } from '@/components/StyleSelector'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import { MusicStyle } from '@/api/songs'

// Mock the store
jest.mock('@/stores/lyricsEditingStore')

// Polyfill for Radix UI Select component in JSDOM
beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false)
  Element.prototype.setPointerCapture = jest.fn()
  Element.prototype.releasePointerCapture = jest.fn()
})

describe('StyleSelector Component', () => {
  const mockSetSelectedStyle = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Default mock with POP style selected
    ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
      selectedStyle: MusicStyle.POP,
      setSelectedStyle: mockSetSelectedStyle,
    })
  })

  describe('Default Value', () => {
    it('displays Pop as the default selected style', () => {
      render(<StyleSelector />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveTextContent('Pop')
    })

    it('shows the default description for Pop style', () => {
      render(<StyleSelector />)
      
      expect(screen.getByText('Upbeat and catchy melodies perfect for memorable learning')).toBeInTheDocument()
    })

    it('has correct aria-label indicating current selection', () => {
      render(<StyleSelector />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-label', 'Select music style. Currently selected: Pop')
    })
  })

  describe('Style Selection', () => {
    it('renders combobox trigger that can be interacted with', () => {
      render(<StyleSelector />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeInTheDocument()
      expect(trigger).not.toBeDisabled()
    })

    it('displays the currently selected style in the trigger', () => {
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        selectedStyle: MusicStyle.ROCK,
        setSelectedStyle: mockSetSelectedStyle,
      })
      
      render(<StyleSelector />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveTextContent('Rock')
    })

    it('displays different styles when store value changes', () => {
      // Test with Jazz
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        selectedStyle: MusicStyle.JAZZ,
        setSelectedStyle: mockSetSelectedStyle,
      })
      
      const { rerender } = render(<StyleSelector />)
      expect(screen.getByRole('combobox')).toHaveTextContent('Jazz')
      
      // Test with Electronic
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        selectedStyle: MusicStyle.ELECTRONIC,
        setSelectedStyle: mockSetSelectedStyle,
      })
      
      rerender(<StyleSelector />)
      expect(screen.getByRole('combobox')).toHaveTextContent('Electronic/EDM')
    })

    it('trigger has correct id for label association', () => {
      render(<StyleSelector />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('id', 'style-selector')
    })
  })

  describe('Description Display', () => {
    it('shows description for selected Pop style', () => {
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        selectedStyle: MusicStyle.POP,
        setSelectedStyle: mockSetSelectedStyle,
      })
      
      render(<StyleSelector />)
      
      expect(screen.getByText('Upbeat and catchy melodies perfect for memorable learning')).toBeInTheDocument()
    })

    it('shows description for selected Rock style', () => {
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        selectedStyle: MusicStyle.ROCK,
        setSelectedStyle: mockSetSelectedStyle,
      })
      
      render(<StyleSelector />)
      
      expect(screen.getByText('Powerful and memorable with strong instrumentation')).toBeInTheDocument()
    })

    it('shows description for selected Jazz style', () => {
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        selectedStyle: MusicStyle.JAZZ,
        setSelectedStyle: mockSetSelectedStyle,
      })
      
      render(<StyleSelector />)
      
      expect(screen.getByText('Smooth and sophisticated with complex harmonies')).toBeInTheDocument()
    })

    it('shows description for selected Children style', () => {
      ;(useLyricsEditingStore as unknown as jest.Mock).mockReturnValue({
        selectedStyle: MusicStyle.CHILDREN,
        setSelectedStyle: mockSetSelectedStyle,
      })
      
      render(<StyleSelector />)
      
      expect(screen.getByText('Simple, fun, and easy to sing along')).toBeInTheDocument()
    })

    it('description has aria-live for accessibility', () => {
      render(<StyleSelector />)
      
      const description = screen.getByRole('status')
      expect(description).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Accessibility', () => {
    it('has proper label for the select', () => {
      render(<StyleSelector />)
      
      expect(screen.getByText('Music Style')).toBeInTheDocument()
    })

    it('has role="group" on container', () => {
      render(<StyleSelector />)
      
      const group = screen.getByRole('group')
      expect(group).toHaveAttribute('aria-labelledby', 'style-selector-label')
    })

    it('trigger has descriptive aria-label', () => {
      render(<StyleSelector />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('Select music style'))
    })
  })
})
