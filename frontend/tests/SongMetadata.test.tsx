import { render, screen, act } from '@testing-library/react'
import { SongMetadata } from '@/components/SongMetadata'
import { formatDate, getTimeRemaining } from '@/lib/song-metadata-utils'
import { MusicStyle } from '@/api/songs'

// Mock timers for countdown testing
jest.useFakeTimers()

describe('SongMetadata Component', () => {
  const defaultProps = {
    style: MusicStyle.POP,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    expiresAt: new Date('2025-01-17T10:00:00Z'), // 48 hours later
  }

  beforeEach(() => {
    jest.setSystemTime(new Date('2025-01-15T12:00:00Z'))
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('rendering', () => {
    it('renders song metadata with all sections', () => {
      render(<SongMetadata {...defaultProps} />)

      expect(screen.getByRole('region', { name: /song metadata/i })).toBeInTheDocument()
      expect(screen.getByTestId('style-badge')).toBeInTheDocument()
      expect(screen.getByTestId('created-date')).toBeInTheDocument()
      expect(screen.getByTestId('expiration-time')).toBeInTheDocument()
    })

    it('displays correct style badge', () => {
      render(<SongMetadata {...defaultProps} />)

      const badge = screen.getByTestId('style-badge')
      expect(badge).toHaveTextContent('Pop')
    })

    it('displays formatted creation date', () => {
      render(<SongMetadata {...defaultProps} />)

      const dateElement = screen.getByTestId('created-date')
      expect(dateElement).toHaveTextContent(/Jan 15, 2025/)
    })
  })

  describe('style badge variations', () => {
    const styles: MusicStyle[] = [
      MusicStyle.POP,
      MusicStyle.RAP,
      MusicStyle.FOLK,
      MusicStyle.ELECTRONIC,
      MusicStyle.ROCK,
      MusicStyle.JAZZ,
      MusicStyle.CHILDREN,
      MusicStyle.CLASSICAL,
    ]

    it.each(styles)('renders %s style correctly', (style) => {
      render(<SongMetadata {...defaultProps} style={style} />)

      const badge = screen.getByTestId('style-badge')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('expiration warning', () => {
    it('shows warning when expiration is within 6 hours', () => {
      const expiresAt = new Date('2025-01-15T17:00:00Z') // 5 hours from now
      render(<SongMetadata {...defaultProps} expiresAt={expiresAt} />)

      expect(screen.getByTestId('expiration-warning')).toBeInTheDocument()
      expect(screen.getByText(/will expire soon/i)).toBeInTheDocument()
    })

    it('does not show warning when expiration is more than 6 hours away', () => {
      const expiresAt = new Date('2025-01-15T20:00:00Z') // 8 hours from now
      render(<SongMetadata {...defaultProps} expiresAt={expiresAt} />)

      expect(screen.queryByTestId('expiration-warning')).not.toBeInTheDocument()
    })
  })

  describe('expired state', () => {
    it('shows expired notice when song has expired', () => {
      const expiresAt = new Date('2025-01-15T10:00:00Z') // 2 hours ago
      render(<SongMetadata {...defaultProps} expiresAt={expiresAt} />)

      expect(screen.getByTestId('expired-notice')).toBeInTheDocument()
      expect(screen.getByText(/has expired/i)).toBeInTheDocument()
    })

    it('does not show warning when expired', () => {
      const expiresAt = new Date('2025-01-15T10:00:00Z') // 2 hours ago
      render(<SongMetadata {...defaultProps} expiresAt={expiresAt} />)

      expect(screen.queryByTestId('expiration-warning')).not.toBeInTheDocument()
    })
  })

  describe('countdown updates', () => {
    it('updates countdown every minute', () => {
      const expiresAt = new Date('2025-01-15T14:00:00Z') // 2 hours from now
      render(<SongMetadata {...defaultProps} expiresAt={expiresAt} />)

      expect(screen.getByTestId('expiration-time')).toHaveTextContent('2h remaining')

      // Advance time by 1 minute
      act(() => {
        jest.advanceTimersByTime(60000)
      })

      expect(screen.getByTestId('expiration-time')).toHaveTextContent(/1h 59m remaining/)
    })
  })
})

describe('formatDate utility', () => {
  it('formats date correctly', () => {
    const date = new Date('2025-01-15T15:30:00Z')
    const result = formatDate(date)

    expect(result).toContain('Jan')
    expect(result).toContain('15')
    expect(result).toContain('2025')
  })

  it('handles invalid date', () => {
    const result = formatDate(new Date('invalid'))
    expect(result).toBe('Unknown date')
  })
})

describe('getTimeRemaining utility', () => {
  const baseTime = new Date('2025-01-15T12:00:00Z')

  it('calculates hours and minutes correctly', () => {
    const expiresAt = new Date('2025-01-15T14:30:00Z') // 2h 30m later
    const result = getTimeRemaining(expiresAt, baseTime)

    expect(result.hours).toBe(2)
    expect(result.minutes).toBe(30)
    expect(result.isExpired).toBe(false)
  })

  it('returns expired for past dates', () => {
    const expiresAt = new Date('2025-01-15T10:00:00Z') // 2h ago
    const result = getTimeRemaining(expiresAt, baseTime)

    expect(result.isExpired).toBe(true)
    expect(result.formatted).toBe('Expired')
  })

  it('sets warning flag for less than 6 hours', () => {
    const expiresAt = new Date('2025-01-15T17:00:00Z') // 5h later
    const result = getTimeRemaining(expiresAt, baseTime)

    expect(result.isWarning).toBe(true)
  })

  it('does not set warning flag for 6+ hours', () => {
    const expiresAt = new Date('2025-01-15T19:00:00Z') // 7h later
    const result = getTimeRemaining(expiresAt, baseTime)

    expect(result.isWarning).toBe(false)
  })

  it('formats days correctly', () => {
    const expiresAt = new Date('2025-01-17T14:00:00Z') // 2d 2h later
    const result = getTimeRemaining(expiresAt, baseTime)

    expect(result.formatted).toContain('2d')
  })
})
