import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useTextInputStore } from '@/stores/textInputStore'
import { useGenerateLyrics, useRateLimit } from '@/hooks/useLyrics'
import { showValidationError, showRateLimitError } from '@/lib/toast-utils'
import { Loader2 } from 'lucide-react'

export function GenerateButton() {
  const navigate = useNavigate()
  const { content, isGenerating, setGenerating, searchEnabled } = useTextInputStore()
  const { mutate: generateLyrics, isPending, data: lyricsData, isSuccess } = useGenerateLyrics()
  const { data: rateLimitData } = useRateLimit()

  // Navigate to lyrics editing page on successful generation
  useEffect(() => {
    if (isSuccess && lyricsData) {
      navigate('/lyrics-edit', { 
        state: { 
          lyrics: lyricsData.lyrics,
          contentHash: lyricsData.content_hash
        } 
      })
    }
  }, [isSuccess, lyricsData, navigate])

  // Calculate word count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  // Determine if button should be disabled
  const isDisabled = 
    !content.trim() || 
    wordCount > 10000 || 
    (rateLimitData?.remaining ?? 0) === 0 || 
    isGenerating ||
    isPending

  const handleGenerate = useCallback(() => {
    // Show specific validation errors
    if (!content.trim()) {
      showValidationError('Please enter some content to generate lyrics.')
      return
    }

    if (wordCount > 10000) {
      showValidationError(`Content exceeds the 10,000 word limit (${wordCount.toLocaleString()} words).`)
      return
    }

    if ((rateLimitData?.remaining ?? 0) === 0) {
      showRateLimitError(rateLimitData?.reset_time ? new Date(rateLimitData.reset_time) : undefined)
      return
    }

    if (isDisabled) return

    generateLyrics({
      content,
      search_enabled: searchEnabled,
    })
  }, [isDisabled, content, searchEnabled, generateLyrics, wordCount, rateLimitData])

  // Handle keyboard shortcut (Ctrl+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isDisabled) {
        handleGenerate()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDisabled, handleGenerate])

  // Sync generating state
  useEffect(() => {
    setGenerating(isPending)
  }, [isPending, setGenerating])

  return (
    <Button
      onClick={handleGenerate}
      disabled={isDisabled}
      size="lg"
      className="w-full"
      aria-label={isPending ? 'Generating lyrics, please wait' : 'Generate lyrics from content'}
      aria-busy={isPending}
      aria-disabled={isDisabled}
    >
      {isPending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          Generating Lyrics...
        </>
      ) : (
        <>
          Generate Lyrics
          <span className="text-xs opacity-70" aria-label="Keyboard shortcut: Control plus Enter">(Ctrl+Enter)</span>
        </>
      )}
    </Button>
  )
}
