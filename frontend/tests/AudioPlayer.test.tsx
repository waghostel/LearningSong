import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AudioPlayer, formatTime, generateDownloadFilename } from '@/components/AudioPlayer'

// Mock HTMLMediaElement methods
const mockPlay = jest.fn().mockResolvedValue(undefined)
const mockPause = jest.fn()

beforeAll(() => {
  // Mock HTMLMediaElement prototype
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: mockPlay,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: mockPause,
  })
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('AudioPlayer Component', () => {
  const defaultProps = {
    songUrl: 'https://example.com/song.mp3',
    songStyle: 'pop',
  }

  describe('rendering', () => {
    it('renders audio player with controls', () => {
      render(<AudioPlayer {...defaultProps} />)

      expect(screen.getByRole('region', { name: /audio player/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument()
      expect(screen.getByRole('slider', { name: /seek/i })).toBeInTheDocument()
    })

    it('displays initial time as 00:00 / 00:00', () => {
      render(<AudioPlayer {...defaultProps} />)

      expect(screen.getByText('00:00 / 00:00')).toBeInTheDocument()
    })
  })

  describe('play/pause functionality', () => {
    it('calls play when play button is clicked', async () => {
      const user = userEvent.setup()
      render(<AudioPlayer {...defaultProps} />)

      // Simulate metadata loaded
      const audio = document.querySelector('audio')!
      Object.defineProperty(audio, 'duration', { value: 180, writable: true })
      fireEvent.loadedMetadata(audio)

      const playButton = screen.getByRole('button', { name: /play/i })
      await user.click(playButton)

      expect(mockPlay).toHaveBeenCalled()
    })

    it('calls pause when pause button is clicked', async () => {
      const user = userEvent.setup()
      render(<AudioPlayer {...defaultProps} />)

      const audio = document.querySelector('audio')!
      Object.defineProperty(audio, 'duration', { value: 180, writable: true })
      fireEvent.loadedMetadata(audio)

      // Start playing
      const playButton = screen.getByRole('button', { name: /play/i })
      await user.click(playButton)
      fireEvent.play(audio)

      // Now pause
      const pauseButton = screen.getByRole('button', { name: /pause/i })
      await user.click(pauseButton)

      expect(mockPause).toHaveBeenCalled()
    })

    it('toggles aria-pressed state', async () => {
      const user = userEvent.setup()
      render(<AudioPlayer {...defaultProps} />)

      const audio = document.querySelector('audio')!
      Object.defineProperty(audio, 'duration', { value: 180, writable: true })
      fireEvent.loadedMetadata(audio)

      const button = screen.getByRole('button', { name: /play/i })
      expect(button).toHaveAttribute('aria-pressed', 'false')

      await user.click(button)
      fireEvent.play(audio)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toHaveAttribute('aria-pressed', 'true')
      })
    })
  })

  describe('seek bar interaction', () => {
    it('updates audio currentTime when seek bar changes', () => {
      render(<AudioPlayer {...defaultProps} />)

      const audio = document.querySelector('audio')!
      Object.defineProperty(audio, 'duration', { value: 180, writable: true })
      Object.defineProperty(audio, 'currentTime', { value: 0, writable: true })
      fireEvent.loadedMetadata(audio)

      const seekBar = screen.getByRole('slider', { name: /seek/i })
      fireEvent.change(seekBar, { target: { value: '90' } })

      expect(audio.currentTime).toBe(90)
    })
  })

  describe('time display updates', () => {
    it('updates time display on timeupdate event', () => {
      const onTimeUpdate = jest.fn()
      render(<AudioPlayer {...defaultProps} onTimeUpdate={onTimeUpdate} />)

      const audio = document.querySelector('audio')!
      Object.defineProperty(audio, 'duration', { value: 180, writable: true })
      Object.defineProperty(audio, 'currentTime', { value: 45, writable: true })
      fireEvent.loadedMetadata(audio)
      fireEvent.timeUpdate(audio)

      expect(screen.getByText('00:45 / 03:00')).toBeInTheDocument()
      expect(onTimeUpdate).toHaveBeenCalledWith(45, 180)
    })
  })

  describe('download button', () => {
    it('is enabled when not disabled', () => {
      render(<AudioPlayer {...defaultProps} />)

      const downloadButton = screen.getByRole('button', { name: /download/i })
      expect(downloadButton).not.toBeDisabled()
    })

    it('is disabled when disabled prop is true', () => {
      render(<AudioPlayer {...defaultProps} disabled />)

      const downloadButton = screen.getByRole('button', { name: /download/i })
      expect(downloadButton).toBeDisabled()
    })
  })

  describe('disabled state', () => {
    it('disables all controls when disabled prop is true', () => {
      render(<AudioPlayer {...defaultProps} disabled />)

      expect(screen.getByRole('button', { name: /play/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /download/i })).toBeDisabled()
      expect(screen.getByRole('slider', { name: /seek/i })).toBeDisabled()
    })

    it('applies opacity styling when disabled', () => {
      render(<AudioPlayer {...defaultProps} disabled />)

      const container = screen.getByRole('region', { name: /audio player/i })
      expect(container).toHaveClass('opacity-50')
    })
  })

  describe('error handling', () => {
    it('displays error message when audio fails to load', () => {
      const onError = jest.fn()
      render(<AudioPlayer {...defaultProps} onError={onError} />)

      const audio = document.querySelector('audio')!
      fireEvent.error(audio)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/unable to load audio/i)).toBeInTheDocument()
      expect(onError).toHaveBeenCalled()
    })

    it('disables play button when there is an error', () => {
      render(<AudioPlayer {...defaultProps} />)

      const audio = document.querySelector('audio')!
      fireEvent.error(audio)

      expect(screen.getByRole('button', { name: /play/i })).toBeDisabled()
    })
  })

  describe('onEnded callback', () => {
    it('calls onEnded when audio ends', () => {
      const onEnded = jest.fn()
      render(<AudioPlayer {...defaultProps} onEnded={onEnded} />)

      const audio = document.querySelector('audio')!
      fireEvent.ended(audio)

      expect(onEnded).toHaveBeenCalled()
    })
  })
})

describe('formatTime utility', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  it('formats 65 seconds as 01:05', () => {
    expect(formatTime(65)).toBe('01:05')
  })

  it('formats 180 seconds as 03:00', () => {
    expect(formatTime(180)).toBe('03:00')
  })

  it('handles NaN gracefully', () => {
    expect(formatTime(NaN)).toBe('00:00')
  })

  it('handles negative numbers gracefully', () => {
    expect(formatTime(-10)).toBe('00:00')
  })
})

describe('generateDownloadFilename utility', () => {
  it('includes style in filename', () => {
    const filename = generateDownloadFilename('pop')
    expect(filename).toContain('pop')
    expect(filename).toMatch(/\.mp3$/)
  })

  it('generates valid filename without style', () => {
    const filename = generateDownloadFilename()
    expect(filename).toMatch(/^learning-song-\d{4}-\d{2}-\d{2}\.mp3$/)
  })
})
