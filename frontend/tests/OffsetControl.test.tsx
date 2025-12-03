/**
 * Unit tests for OffsetControl component
 * 
 * Tests:
 * - Rendering with default props
 * - Slider value changes
 * - +/- button clicks
 * - Reset button
 * - Keyboard accessibility
 */
import * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OffsetControl } from '@/components/OffsetControl'
import { OFFSET_MIN, OFFSET_MAX, OFFSET_STEP } from '@/lib/offset-utils'

describe('OffsetControl', () => {
  const defaultProps = {
    offset: 0,
    onChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<OffsetControl {...defaultProps} />)

      expect(screen.getByTestId('offset-control')).toBeInTheDocument()
      expect(screen.getByTestId('offset-slider')).toBeInTheDocument()
      expect(screen.getByTestId('offset-decrement')).toBeInTheDocument()
      expect(screen.getByTestId('offset-increment')).toBeInTheDocument()
      expect(screen.getByTestId('offset-reset')).toBeInTheDocument()
      expect(screen.getByTestId('offset-value')).toBeInTheDocument()
    })

    it('should display current offset value', () => {
      render(<OffsetControl {...defaultProps} offset={150} />)

      expect(screen.getByTestId('offset-value')).toHaveTextContent('+150ms')
    })

    it('should display negative offset with minus sign', () => {
      render(<OffsetControl {...defaultProps} offset={-200} />)

      expect(screen.getByTestId('offset-value')).toHaveTextContent('-200ms')
    })

    it('should display zero offset without sign', () => {
      render(<OffsetControl {...defaultProps} offset={0} />)

      expect(screen.getByTestId('offset-value')).toHaveTextContent('0ms')
    })

    it('should render label text', () => {
      render(<OffsetControl {...defaultProps} />)

      expect(screen.getByText('Lyrics Timing Offset')).toBeInTheDocument()
    })

    it('should render description text', () => {
      render(<OffsetControl {...defaultProps} />)

      expect(
        screen.getByText(/Adjust timing to sync lyrics with audio/)
      ).toBeInTheDocument()
    })
  })

  describe('Slider interactions', () => {
    it('should call onChange when slider value changes', () => {
      const onChange = jest.fn()
      render(<OffsetControl {...defaultProps} onChange={onChange} />)

      const slider = screen.getByTestId('offset-slider')
      fireEvent.change(slider, { target: { value: '500' } })

      expect(onChange).toHaveBeenCalledWith(500)
    })

    it('should have correct min/max attributes', () => {
      render(<OffsetControl {...defaultProps} />)

      const slider = screen.getByTestId('offset-slider')
      expect(slider).toHaveAttribute('min', String(OFFSET_MIN))
      expect(slider).toHaveAttribute('max', String(OFFSET_MAX))
      expect(slider).toHaveAttribute('step', String(OFFSET_STEP))
    })

    it('should respect custom min/max values', () => {
      render(
        <OffsetControl {...defaultProps} min={-1000} max={1000} step={100} />
      )

      const slider = screen.getByTestId('offset-slider')
      expect(slider).toHaveAttribute('min', '-1000')
      expect(slider).toHaveAttribute('max', '1000')
      expect(slider).toHaveAttribute('step', '100')
    })
  })

  describe('Button interactions', () => {
    it('should decrement offset when minus button is clicked', async () => {
      const onChange = jest.fn()
      const user = userEvent.setup()
      render(<OffsetControl {...defaultProps} offset={100} onChange={onChange} />)

      await user.click(screen.getByTestId('offset-decrement'))

      expect(onChange).toHaveBeenCalledWith(50)
    })

    it('should increment offset when plus button is clicked', async () => {
      const onChange = jest.fn()
      const user = userEvent.setup()
      render(<OffsetControl {...defaultProps} offset={100} onChange={onChange} />)

      await user.click(screen.getByTestId('offset-increment'))

      expect(onChange).toHaveBeenCalledWith(150)
    })

    it('should reset offset to 0 when reset button is clicked', async () => {
      const onChange = jest.fn()
      const user = userEvent.setup()
      render(<OffsetControl {...defaultProps} offset={500} onChange={onChange} />)

      await user.click(screen.getByTestId('offset-reset'))

      expect(onChange).toHaveBeenCalledWith(0)
    })

    it('should disable decrement button at minimum', () => {
      render(<OffsetControl {...defaultProps} offset={OFFSET_MIN} />)

      expect(screen.getByTestId('offset-decrement')).toBeDisabled()
    })

    it('should disable increment button at maximum', () => {
      render(<OffsetControl {...defaultProps} offset={OFFSET_MAX} />)

      expect(screen.getByTestId('offset-increment')).toBeDisabled()
    })

    it('should disable reset button when offset is 0', () => {
      render(<OffsetControl {...defaultProps} offset={0} />)

      expect(screen.getByTestId('offset-reset')).toBeDisabled()
    })

    it('should enable reset button when offset is not 0', () => {
      render(<OffsetControl {...defaultProps} offset={100} />)

      expect(screen.getByTestId('offset-reset')).not.toBeDisabled()
    })
  })

  describe('Disabled state', () => {
    it('should disable all controls when disabled prop is true', () => {
      render(<OffsetControl {...defaultProps} disabled={true} />)

      expect(screen.getByTestId('offset-slider')).toBeDisabled()
      expect(screen.getByTestId('offset-decrement')).toBeDisabled()
      expect(screen.getByTestId('offset-increment')).toBeDisabled()
      expect(screen.getByTestId('offset-reset')).toBeDisabled()
    })
  })

  describe('Keyboard accessibility', () => {
    it('should have proper ARIA attributes on slider', () => {
      render(<OffsetControl {...defaultProps} offset={100} />)

      const slider = screen.getByTestId('offset-slider')
      expect(slider).toHaveAttribute('aria-valuemin', String(OFFSET_MIN))
      expect(slider).toHaveAttribute('aria-valuemax', String(OFFSET_MAX))
      expect(slider).toHaveAttribute('aria-valuenow', '100')
      expect(slider).toHaveAttribute('aria-valuetext', '+100ms')
    })

    it('should have ARIA labels on buttons', () => {
      render(<OffsetControl {...defaultProps} />)

      expect(screen.getByTestId('offset-decrement')).toHaveAttribute(
        'aria-label',
        `Decrease offset by ${OFFSET_STEP}ms`
      )
      expect(screen.getByTestId('offset-increment')).toHaveAttribute(
        'aria-label',
        `Increase offset by ${OFFSET_STEP}ms`
      )
      expect(screen.getByTestId('offset-reset')).toHaveAttribute(
        'aria-label',
        'Reset offset to 0ms'
      )
    })

    it('should handle Home key to set minimum', () => {
      const onChange = jest.fn()
      render(<OffsetControl {...defaultProps} offset={500} onChange={onChange} />)

      const slider = screen.getByTestId('offset-slider')
      fireEvent.keyDown(slider, { key: 'Home' })

      expect(onChange).toHaveBeenCalledWith(OFFSET_MIN)
    })

    it('should handle End key to set maximum', () => {
      const onChange = jest.fn()
      render(<OffsetControl {...defaultProps} offset={500} onChange={onChange} />)

      const slider = screen.getByTestId('offset-slider')
      fireEvent.keyDown(slider, { key: 'End' })

      expect(onChange).toHaveBeenCalledWith(OFFSET_MAX)
    })

    it('should handle PageUp key for large increment', () => {
      const onChange = jest.fn()
      render(<OffsetControl {...defaultProps} offset={0} onChange={onChange} />)

      const slider = screen.getByTestId('offset-slider')
      fireEvent.keyDown(slider, { key: 'PageUp' })

      expect(onChange).toHaveBeenCalledWith(OFFSET_STEP * 10)
    })

    it('should handle PageDown key for large decrement', () => {
      const onChange = jest.fn()
      render(<OffsetControl {...defaultProps} offset={0} onChange={onChange} />)

      const slider = screen.getByTestId('offset-slider')
      fireEvent.keyDown(slider, { key: 'PageDown' })

      expect(onChange).toHaveBeenCalledWith(-OFFSET_STEP * 10)
    })
  })

  describe('Screen reader announcements', () => {
    it('should have live region for announcements', () => {
      render(<OffsetControl {...defaultProps} />)

      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
    })
  })
})
