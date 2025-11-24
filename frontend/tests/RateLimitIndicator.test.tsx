import { render, screen, waitFor } from '@testing-library/react'
import { RateLimitIndicator } from '@/components/RateLimitIndicator'
import { useRateLimit } from '@/hooks/useLyrics'

// Mock the hook
jest.mock('@/hooks/useLyrics')

describe('RateLimitIndicator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows loading state initially', () => {
    ;(useRateLimit as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })
    
    render(<RateLimitIndicator />)
    
    expect(screen.getByText(/Loading rate limit/i)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading rate limit information')
  })

  it('shows error state when fetch fails', () => {
    ;(useRateLimit as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    })
    
    render(<RateLimitIndicator />)
    
    expect(screen.getByText(/Unable to load rate limit/i)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('displays 3/3 remaining with green color', () => {
    ;(useRateLimit as jest.Mock).mockReturnValue({
      data: { remaining: 3, reset_time: new Date(Date.now() + 86400000).toISOString() },
      isLoading: false,
      error: null,
    })
    
    render(<RateLimitIndicator />)
    
    const status = screen.getByText(/3\/3 songs remaining today/i)
    expect(status).toBeInTheDocument()
    expect(status).toHaveClass('text-green-700')
  })

  it('displays 2/3 remaining with yellow color', () => {
    ;(useRateLimit as jest.Mock).mockReturnValue({
      data: { remaining: 2, reset_time: new Date(Date.now() + 86400000).toISOString() },
      isLoading: false,
      error: null,
    })
    
    render(<RateLimitIndicator />)
    
    const status = screen.getByText(/2\/3 songs remaining today/i)
    expect(status).toBeInTheDocument()
    expect(status).toHaveClass('text-yellow-700')
  })

  it('displays 1/3 remaining with yellow color', () => {
    ;(useRateLimit as jest.Mock).mockReturnValue({
      data: { remaining: 1, reset_time: new Date(Date.now() + 86400000).toISOString() },
      isLoading: false,
      error: null,
    })
    
    render(<RateLimitIndicator />)
    
    const status = screen.getByText(/1\/3 songs remaining today/i)
    expect(status).toBeInTheDocument()
    expect(status).toHaveClass('text-yellow-700')
  })

  it('displays 0/3 remaining with red color', () => {
    ;(useRateLimit as jest.Mock).mockReturnValue({
      data: { remaining: 0, reset_time: new Date(Date.now() + 86400000).toISOString() },
      isLoading: false,
      error: null,
    })
    
    render(<RateLimitIndicator />)
    
    const status = screen.getByText(/0\/3 songs remaining today/i)
    expect(status).toBeInTheDocument()
    expect(status).toHaveClass('text-red-700')
  })

  it('shows countdown timer when limit is reached', async () => {
    const resetTime = new Date(Date.now() + 3661000) // 1h 1m 1s from now
    ;(useRateLimit as jest.Mock).mockReturnValue({
      data: { remaining: 0, reset_time: resetTime.toISOString() },
      isLoading: false,
      error: null,
    })
    
    render(<RateLimitIndicator />)
    
    await waitFor(() => {
      expect(screen.getByText(/Resets in:/i)).toBeInTheDocument()
      expect(screen.getByText(/1h 1m/i)).toBeInTheDocument()
    })
  })

  it('does not show countdown timer when songs are available', () => {
    ;(useRateLimit as jest.Mock).mockReturnValue({
      data: { remaining: 2, reset_time: new Date(Date.now() + 86400000).toISOString() },
      isLoading: false,
      error: null,
    })
    
    render(<RateLimitIndicator />)
    
    expect(screen.queryByText(/Resets in:/i)).not.toBeInTheDocument()
  })

  it('updates countdown timer every second', async () => {
    const resetTime = new Date(Date.now() + 5000) // 5 seconds from now
    ;(useRateLimit as jest.Mock).mockReturnValue({
      data: { remaining: 0, reset_time: resetTime.toISOString() },
      isLoading: false,
      error: null,
    })
    
    render(<RateLimitIndicator />)
    
    // Initial state
    await waitFor(() => {
      expect(screen.getByText(/0h 0m 5s/i)).toBeInTheDocument()
    })
    
    // Advance timer by 1 second
    jest.advanceTimersByTime(1000)
    
    await waitFor(() => {
      expect(screen.getByText(/0h 0m 4s/i)).toBeInTheDocument()
    })
  })
})
