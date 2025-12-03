import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import {
  clampOffset,
  formatOffsetDisplay,
  incrementOffset,
  decrementOffset,
  OFFSET_MIN,
  OFFSET_MAX,
  OFFSET_STEP,
} from '@/lib/offset-utils'

export interface OffsetControlProps {
  /** Current offset in milliseconds */
  offset: number
  /** Callback when offset changes */
  onChange: (offset: number) => void
  /** Minimum offset value (default: -2000) */
  min?: number
  /** Maximum offset value (default: 2000) */
  max?: number
  /** Step size for increment/decrement (default: 50) */
  step?: number
  /** Whether the control is disabled */
  disabled?: boolean
  /** Optional className for styling */
  className?: string
}

/**
 * OffsetControl component for adjusting lyrics timing offset
 * 
 * Requirements: 2.2, 2.5, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 * 
 * - Displays slider with range -2000 to +2000 ms
 * - Minus/plus buttons for 50ms increments
 * - Reset button to set offset to 0
 * - Shows current offset value in milliseconds
 * - ARIA labels for accessibility
 * - Keyboard accessible
 */
export function OffsetControl({
  offset,
  onChange,
  min = OFFSET_MIN,
  max = OFFSET_MAX,
  step = OFFSET_STEP,
  disabled = false,
  className,
}: OffsetControlProps) {
  const sliderId = React.useId()
  const [liveRegionText, setLiveRegionText] = React.useState('')

  // Announce offset changes to screen readers
  const announceChange = React.useCallback((newOffset: number) => {
    setLiveRegionText(`Offset set to ${formatOffsetDisplay(newOffset)}`)
  }, [])

  const handleDecrement = React.useCallback(() => {
    const newOffset = decrementOffset(offset, step, min)
    onChange(newOffset)
    announceChange(newOffset)
  }, [offset, step, min, onChange, announceChange])

  const handleIncrement = React.useCallback(() => {
    const newOffset = incrementOffset(offset, step, max)
    onChange(newOffset)
    announceChange(newOffset)
  }, [offset, step, max, onChange, announceChange])

  const handleReset = React.useCallback(() => {
    onChange(0)
    announceChange(0)
  }, [onChange, announceChange])

  const handleSliderChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newOffset = clampOffset(parseInt(event.target.value, 10), min, max)
      onChange(newOffset)
      announceChange(newOffset)
    },
    [min, max, onChange, announceChange]
  )

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      // Handle keyboard navigation for slider
      let newOffset: number | null = null

      switch (event.key) {
        case 'Home':
          newOffset = min
          event.preventDefault()
          break
        case 'End':
          newOffset = max
          event.preventDefault()
          break
        case 'PageUp':
          newOffset = clampOffset(offset + step * 10, min, max)
          event.preventDefault()
          break
        case 'PageDown':
          newOffset = clampOffset(offset - step * 10, min, max)
          event.preventDefault()
          break
      }

      if (newOffset !== null) {
        onChange(newOffset)
        announceChange(newOffset)
      }
    },
    [offset, step, min, max, onChange, announceChange]
  )

  // Calculate slider position percentage for visual feedback
  const sliderPercentage = ((offset - min) / (max - min)) * 100

  return (
    <div
      data-testid="offset-control"
      className={cn('flex flex-col gap-2', className)}
    >
      <label
        id={`${sliderId}-label`}
        htmlFor={sliderId}
        className="text-sm font-medium"
      >
        Lyrics Timing Offset
      </label>

      <div className="flex items-center gap-2">
        {/* Decrement button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          disabled={disabled || offset <= min}
          aria-label={`Decrease offset by ${step}ms`}
          className="min-h-[44px] min-w-[44px] shrink-0"
          data-testid="offset-decrement"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>

        {/* Slider */}
        <div className="relative flex-1">
          <input
            type="range"
            id={sliderId}
            min={min}
            max={max}
            step={step}
            value={offset}
            onChange={handleSliderChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-label="Lyrics timing offset"
            aria-labelledby={`${sliderId}-label`}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={offset}
            aria-valuetext={formatOffsetDisplay(offset)}
            aria-describedby={`${sliderId}-description`}
            className={cn(
              'w-full h-2 rounded-lg appearance-none cursor-pointer',
              'bg-secondary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50',
              // Custom slider thumb styling
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:w-4',
              '[&::-webkit-slider-thumb]:h-4',
              '[&::-webkit-slider-thumb]:rounded-full',
              '[&::-webkit-slider-thumb]:bg-primary',
              '[&::-webkit-slider-thumb]:cursor-pointer',
              '[&::-webkit-slider-thumb]:shadow-md',
              '[&::-webkit-slider-thumb]:transition-transform',
              '[&::-webkit-slider-thumb]:hover:scale-110',
              '[&::-moz-range-thumb]:w-4',
              '[&::-moz-range-thumb]:h-4',
              '[&::-moz-range-thumb]:rounded-full',
              '[&::-moz-range-thumb]:bg-primary',
              '[&::-moz-range-thumb]:border-0',
              '[&::-moz-range-thumb]:cursor-pointer'
            )}
            data-testid="offset-slider"
          />
          {/* Visual track fill */}
          <div
            className="absolute top-0 left-0 h-2 rounded-l-lg bg-primary/30 pointer-events-none"
            style={{ width: `${sliderPercentage}%` }}
            aria-hidden="true"
          />
        </div>

        {/* Increment button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleIncrement}
          disabled={disabled || offset >= max}
          aria-label={`Increase offset by ${step}ms`}
          className="min-h-[44px] min-w-[44px] shrink-0"
          data-testid="offset-increment"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>

        {/* Current value display */}
        <span
          className={cn(
            'min-w-[70px] text-center text-sm font-mono tabular-nums',
            offset === 0 ? 'text-muted-foreground' : 'text-foreground'
          )}
          aria-hidden="true"
          data-testid="offset-value"
        >
          {formatOffsetDisplay(offset)}
        </span>

        {/* Reset button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleReset}
          disabled={disabled || offset === 0}
          aria-label="Reset offset to 0ms"
          className="min-h-[44px] min-w-[44px] shrink-0"
          data-testid="offset-reset"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Description text */}
      <p
        id={`${sliderId}-description`}
        className="text-xs text-muted-foreground"
      >
        Adjust timing to sync lyrics with audio. Negative values show lyrics earlier.
      </p>

      {/* Screen reader live region for offset announcements */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {liveRegionText}
      </div>
    </div>
  )
}
