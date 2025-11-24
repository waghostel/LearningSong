import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchToggle } from '@/components/SearchToggle'
import { useTextInputStore } from '@/stores/textInputStore'

// Mock the store
jest.mock('@/stores/textInputStore')

describe('SearchToggle Component', () => {
  const mockToggleSearch = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      searchEnabled: false,
      toggleSearch: mockToggleSearch,
    })
  })

  it('renders with correct label and description', () => {
    render(<SearchToggle />)
    
    expect(screen.getByText('Enrich with Google Search')).toBeInTheDocument()
    expect(screen.getByText(/Use Google Search to add relevant context/i)).toBeInTheDocument()
  })

  it('renders switch with correct accessibility attributes', () => {
    render(<SearchToggle />)
    
    const switchElement = screen.getByRole('switch', { name: /Toggle Google Search grounding/i })
    expect(switchElement).toBeInTheDocument()
    expect(switchElement).toHaveAttribute('aria-describedby', 'search-toggle-description')
  })

  it('shows unchecked state when searchEnabled is false', () => {
    render(<SearchToggle />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('aria-checked', 'false')
  })

  it('shows checked state when searchEnabled is true', () => {
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      searchEnabled: true,
      toggleSearch: mockToggleSearch,
    })
    
    render(<SearchToggle />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('aria-checked', 'true')
  })

  it('calls toggleSearch when clicked', async () => {
    const user = userEvent.setup()
    render(<SearchToggle />)
    
    const switchElement = screen.getByRole('switch')
    await user.click(switchElement)
    
    expect(mockToggleSearch).toHaveBeenCalledTimes(1)
  })

  it('toggles between states correctly', async () => {
    const { rerender } = render(<SearchToggle />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('aria-checked', 'false')
    
    // Simulate toggle
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      searchEnabled: true,
      toggleSearch: mockToggleSearch,
    })
    
    rerender(<SearchToggle />)
    
    expect(switchElement).toHaveAttribute('aria-checked', 'true')
  })
})
