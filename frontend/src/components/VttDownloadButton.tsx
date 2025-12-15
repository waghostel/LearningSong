/**
 * VTT download button component for exporting line-level lyrics as WebVTT subtitle files
 * 
 * Generates and downloads a VTT (WebVTT) subtitle file with line-level timestamps.
 * The button is only visible when line-level timestamps are available.
 * 
 * **Feature: song-playback-improvements**
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
 */

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import type { LineCue } from '@/lib/vtt-generator'
import { generateVttContent, downloadVttFile, generateVttFilename } from '@/lib/vtt-generator'

interface VttDownloadButtonProps {
  lineCues: LineCue[]           // Line-level timestamps
  songStyle: string             // Music style (e.g., "Pop", "Rap")
  createdAt: Date               // Song creation date
  offset?: number               // Optional offset in milliseconds to apply to timestamps
  disabled?: boolean            // Whether button is disabled
}

/**
 * VttDownloadButton component
 * 
 * Renders a download button that generates and downloads a VTT subtitle file.
 * The button is hidden when no line-level timestamps are available.
 * 
 * **Feature: song-playback-improvements, Property 15: VTT download visibility**
 * **Validates: Requirements 10.1, 10.5**
 * 
 * @example
 * ```tsx
 * <VttDownloadButton
 *   lineCues={lineCues}
 *   songStyle="Pop"
 *   createdAt={new Date()}
 *   offset={150}
 * />
 * ```
 */
export function VttDownloadButton({
  lineCues,
  songStyle,
  createdAt,
  offset = 0,
  disabled = false,
}: VttDownloadButtonProps) {
  const handleDownload = useCallback(() => {
    try {
      // Generate VTT content with offset applied
      // Requirements: 10.2, 10.3
      const vttContent = generateVttContent(lineCues, offset)
      
      // Generate filename from style and date
      // Requirements: 10.4
      const filename = generateVttFilename(songStyle, createdAt)
      
      // Trigger download
      downloadVttFile(vttContent, filename)
    } catch (error) {
      console.error('Failed to download VTT file:', error)
      // Could show a toast error here if needed
    }
  }, [lineCues, songStyle, createdAt, offset])

  /* 
   * Hide button when no line cues available
   * Requirements: 10.1, 10.5
   */
  if (lineCues.length === 0) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={disabled}
      className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label="Download lyrics as VTT subtitle file"
      title="Download VTT subtitle file with line-level timestamps"
    >
      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
      Download VTT
    </Button>
  )
}
