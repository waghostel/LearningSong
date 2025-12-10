import * as React from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { X, Pencil } from 'lucide-react'
import type { LyricsVersion } from '@/stores/lyricsEditingStore'

/**
 * VersionSelector Component
 * 
 * Displays a horizontal pill-style selector for managing lyrics versions.
 * Requirements: 2.1, 2.5, 3.1, 3.4, 5.2, 6.4
 */

export interface VersionSelectorProps {
  versions: LyricsVersion[]
  activeVersionId: string | null
  onVersionSelect: (versionId: string) => void
  onVersionDelete: (versionId: string) => void
  disabled?: boolean
}

/**
 * Formats a timestamp to a human-readable relative time string.
 * e.g., "2 minutes ago", "1 hour ago", "Just now"
 */
const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const dateToFormat = date instanceof Date ? date : new Date(date)
  const diffMs = now.getTime() - dateToFormat.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) {
    return 'Just now'
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`
  } else {
    return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
  }
}

/**
 * Formats a timestamp to an absolute date/time string for tooltip display.
 * e.g., "Dec 9, 2024, 10:30 AM"
 */
const formatAbsoluteTime = (date: Date): string => {
  const dateToFormat = date instanceof Date ? date : new Date(date)
  return dateToFormat.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export const VersionSelector: React.FC<VersionSelectorProps> = ({
  versions,
  activeVersionId,
  onVersionSelect,
  onVersionDelete,
  disabled = false,
}) => {
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([])
  
  // Sort versions chronologically by createdAt (oldest first) for display (Requirements: 8.1)
  const sortedVersions = [...versions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )



  const canDelete = versions.length > 1

  const handleKeyDown = (e: React.KeyboardEvent, index: number, versionId: string) => {
    switch (e.key) {
      case 'ArrowLeft': {
        e.preventDefault()
        const prevIndex = (index - 1 + sortedVersions.length) % sortedVersions.length
        tabRefs.current[prevIndex]?.focus()
        break
      }
      case 'ArrowRight': {
        e.preventDefault()
        const nextIndex = (index + 1) % sortedVersions.length
        tabRefs.current[nextIndex]?.focus()
        break
      }
      case 'Home': {
        e.preventDefault()
        tabRefs.current[0]?.focus()
        break
      }
      case 'End': {
        e.preventDefault()
        tabRefs.current[sortedVersions.length - 1]?.focus()
        break
      }
      case 'Delete': {
        if (canDelete && !disabled) {
          e.preventDefault()
          onVersionDelete(versionId)
        }
        break
      }
    }
  }

  // Hide component when only one version or no versions exist (Requirements: 2.5)
  if (versions.length <= 1) {
    return null
  }

  // Calculate sequential version numbers based on chronological order (Requirements: 3.2)
  const getVersionNumber = (versionId: string): number => {
    const index = sortedVersions.findIndex((v) => v.id === versionId)
    return index + 1
  }

  return (
    <TooltipProvider>
      <div
        className="flex flex-wrap items-center gap-2 mb-3"
        role="tablist"
        aria-label="Lyrics version selector"
        aria-live="polite"
        aria-orientation="horizontal"
      >
        <span className="text-sm font-medium text-muted-foreground mr-1">
          Versions:
        </span>
        {sortedVersions.map((version, index) => {
          const isActive = version.id === activeVersionId
          const versionNumber = getVersionNumber(version.id)
          const relativeTime = formatRelativeTime(version.createdAt)
          const absoluteTime = formatAbsoluteTime(version.createdAt)

          return (
            <div
              key={version.id}
              className="flex items-center"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="tab"
                    id={`version-tab-${version.id}`}
                    ref={(el) => {
                      if (el) tabRefs.current[index] = el
                    }}
                    aria-selected={isActive}
                    aria-controls={`version-panel-${version.id}`}
                    aria-keyshortcuts="Delete"
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => onVersionSelect(version.id)}
                    onKeyDown={(e) => handleKeyDown(e, index, version.id)}
                    disabled={disabled}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-l-full transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                      disabled && 'opacity-50 cursor-not-allowed',
                      !canDelete && 'rounded-r-full'
                    )}
                  >
                    <span>V{versionNumber}</span>
                    {/* Edit indicator (Requirements: 5.2) */}
                    {version.isEdited && (
                      <Pencil
                        className="h-3 w-3"
                        aria-label="Edited"
                        data-testid={`edit-indicator-${version.id}`}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="text-center"
                  data-testid={`version-tooltip-${version.id}`}
                >
                  <div className="space-y-0.5">
                    <p className="font-medium">Version {versionNumber}</p>
                    <p className="text-xs text-muted-foreground">{relativeTime}</p>
                    <p className="text-xs text-muted-foreground">{absoluteTime}</p>
                    {version.isEdited && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Manually edited
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Delete button (Requirements: 6.4) */}
              {canDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onVersionDelete(version.id)}
                      disabled={disabled}
                      aria-label={`Delete version ${versionNumber}`}
                      data-testid={`delete-version-${version.id}`}
                      className={cn(
                        'inline-flex items-center justify-center px-1.5 py-1.5 text-sm rounded-r-full transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        isActive
                          ? 'bg-primary/90 text-primary-foreground hover:bg-primary/70'
                          : 'bg-muted/80 text-muted-foreground hover:bg-destructive/20 hover:text-destructive',
                        disabled && 'opacity-50 cursor-not-allowed'
                      )}
                      tabIndex={-1}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Delete Version {versionNumber}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
