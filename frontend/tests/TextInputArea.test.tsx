import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextInputArea } from '@/components/TextInputArea'
import { useTextInputStore } from '@/stores/textInputStore'

// Mock the store
jest.mock('@/stores/textInputStore')

describe('TextInputArea Component', () => {
  const mockSetContent = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      content: '',
      setContent: mockSetContent,
    })
  })

  it('renders textarea with correct accessibility attributes', () => {
    render(<TextInputArea />)
    
    const textarea = screen.getByRole('textbox', { name: /educational content input/i })
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('aria-label', 'Educational content input')
    expect(textarea).toHaveAttribute('aria-describedby', 'word-counter')
  })

  it('displays word counter with 0 words initially', () => {
    render(<TextInputArea />)
    
    expect(screen.getByText(/0 \/ 10,000 words/i)).toBeInTheDocument()
  })

  it('updates word count correctly', () => {
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      content: 'Hello world test',
      setContent: mockSetContent,
    })
    
    render(<TextInputArea />)
    
    expect(screen.getByText(/3 \/ 10,000 words/i)).toBeInTheDocument()
  })

  it('shows normal state for content under 9000 words', () => {
    const content = 'word '.repeat(5000).trim()
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      content,
      setContent: mockSetContent,
    })
    
    render(<TextInputArea />)
    
    const counter = screen.getByText(/5,000 \/ 10,000 words/i)
    expect(counter).toHaveClass('text-muted-foreground')
  })

  it('shows warning state for content between 9000-10000 words', () => {
    const content = 'word '.repeat(9500).trim()
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      content,
      setContent: mockSetContent,
    })
    
    render(<TextInputArea />)
    
    const counter = screen.getByText(/9,500 \/ 10,000 words/i)
    expect(counter).toHaveClass('text-yellow-700')
    expect(counter).toHaveClass('font-medium')
  })

  it('shows error state for content over 10000 words', () => {
    const content = 'word '.repeat(10500).trim()
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      content,
      setContent: mockSetContent,
    })
    
    render(<TextInputArea />)
    
    const counter = screen.getByText(/10,500 \/ 10,000 words - Content exceeds limit/i)
    expect(counter).toHaveClass('text-red-700')
    expect(counter).toHaveClass('font-semibold')
  })

  it('calls setContent when user types', async () => {
    const user = userEvent.setup()
    render(<TextInputArea />)
    
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Test content')
    
    expect(mockSetContent).toHaveBeenCalled()
  })

  it('handles empty content correctly', () => {
    ;(useTextInputStore as unknown as jest.Mock).mockReturnValue({
      content: '   ',
      setContent: mockSetContent,
    })
    
    render(<TextInputArea />)
    
    expect(screen.getByText(/0 \/ 10,000 words/i)).toBeInTheDocument()
  })
})
