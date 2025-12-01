import * as React from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SongVariation } from '@/api/songs'

export interface SongSwitcherProps {
  variations: SongVariation[]
  activeIndex: number
  onSwitch: (index: number) => void
  isLoading?: boolean
  disabled?: boolean
}

/**
 * SongSwitcher component for toggling between song variations
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.5, 9.1, 9.2, 9.3, 9.4
 * 
 * - Displays segmented control with "Version 1" and "Version 2" buttons
 * - Shows active state styling for currently selected variation
 * - Displays loading indicator during switch operations
 * - Hides component when variations.length < 2
 * - Keyboard accessible (Tab, Arrow keys, Enter/Space) - Requirement 9.2
 * - Screen reader friendly with ARIA labels - Requirement 9.4
 * - Visible focus indicators - Requirement 9.3
 * - Touch targets ≥ 44x44px for mobile - Requirement 9.1
 */
export function SongSwitcher({
  variations,
  activeIndex,
  onSwitch,
  isLoading = false,
  disabled = false,
}: SongSwitcherProps) {
  // Hide component when variations.length < 2 (Requirement 2.2)
  if (variations.length < 2) {
    return null
  }

  const handleValueChange = (value: string) => {
    if (value && !isLoading && !disabled) {
      const index = parseInt(value, 10)
      if (!isNaN(index) && index !== activeIndex) {
        onSwitch(index)
      }
    }
  }

  // Keyboard navigation handler for arrow keys (Requirement 9.2)
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled || isLoading) return

    const currentIndex = activeIndex
    let newIndex: number | null = null

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        // Move to previous variation
        newIndex = currentIndex > 0 ? currentIndex - 1 : variations.length - 1
        event.preventDefault()
        break
      case 'ArrowRight':
      case 'ArrowDown':
        // Move to next variation
        newIndex = currentIndex < variations.length - 1 ? currentIndex + 1 : 0
        event.preventDefault()
        break
      case 'Home':
        // Move to first variation
        newIndex = 0
        event.preventDefault()
        break
      case 'End':
        // Move to last variation
        newIndex = variations.length - 1
        event.preventDefault()
        break
    }

    if (newIndex !== null && newIndex !== currentIndex) {
      onSwitch(newIndex)
    }
  }

  return (
    <div
      data-testid="song-switcher"
      className="flex flex-col gap-2"
    >
      <label
        id="song-switcher-label"
        htmlFor="song-switcher-group"
        className="text-sm font-medium"
      >
        Song Version
      </label>
      
      <ToggleGroup
        type="single"
        value={activeIndex.toString()}
        onValueChange={handleValueChange}
        className="inline-flex rounded-lg border border-input bg-background p-1"
        disabled={disabled || isLoading}
        aria-labelledby="song-switcher-label"
        aria-describedby="song-switcher-description"
        role="group"
        aria-label="Song version switcher"
        onKeyDown={handleKeyDown}
        id="song-switcher-group"
      >
        {variations.map((variation, index) => (
          <ToggleGroupItem
            key={variation.variation_index}
            value={index.toString()}
            aria-label={`Version ${index + 1}${index === activeIndex ? ' (currently playing)' : ''}`}
            aria-current={index === activeIndex ? 'true' : undefined}
            className={cn(
              'flex-1 min-w-[100px] px-4 py-2 text-sm font-medium transition-all',
              'hover:bg-accent hover:text-accent-foreground',
              // Enhanced focus indicators (Requirement 9.3)
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'focus-visible:z-10',
              'disabled:pointer-events-none disabled:opacity-50',
              'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
              'data-[state=on]:shadow-sm',
              // Touch target size for mobile (min 44x44px) - Requirement 9.1
              'min-h-[44px] min-w-[44px]',
              // Additional focus styles for better visibility
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
            disabled={disabled || isLoading}
            tabIndex={index === activeIndex ? 0 : -1}
          >
            <span className="flex items-center gap-2">
              {isLoading && index === activeIndex && (
                <Loader2 
                  className="h-4 w-4 animate-spin" 
                  aria-hidden="true"
                />
              )}
              Version {index + 1}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <p
        id="song-switcher-description"
        className="text-xs text-muted-foreground"
        aria-live="polite"
        role="status"
      >
        {isLoading
          ? 'Switching version...'
          : `Currently playing Version ${activeIndex + 1}`}
      </p>
    </div>
  )
}
