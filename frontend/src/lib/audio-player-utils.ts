/**
 * Utility functions for AudioPlayer component
 * Extracted to avoid react-refresh warnings
 */

/**
 * Format seconds to MM:SS display format
 * @param seconds - Time in seconds
 * @returns Formatted time string in MM:SS format with zero-padding
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00'
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Generate download filename from song style
 * @param style - Music style of the song
 * @returns Filename with style included
 */
export function generateDownloadFilename(style?: string): string {
  const timestamp = new Date().toISOString().slice(0, 10)
  const stylePart = style ? `-${style.toLowerCase()}` : ''
  return `learning-song${stylePart}-${timestamp}.mp3`
}
