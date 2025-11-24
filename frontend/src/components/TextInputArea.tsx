import { useEffect, useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { useTextInputStore } from '@/stores/textInputStore'
import { cn } from '@/lib/utils'

export function TextInputArea() {
  const { content, setContent } = useTextInputStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Calculate word count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  // Determine visual state
  const getState = () => {
    if (wordCount > 10000) return 'error'
    if (wordCount >= 9000) return 'warning'
    return 'normal'
  }

  const state = getState()

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [content])

  return (
    <div className="space-y-2">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste or type your educational content here..."
        className={cn(
          'min-h-[200px] resize-none transition-colors',
          state === 'warning' && 'border-yellow-500 focus-visible:ring-yellow-500',
          state === 'error' && 'border-red-500 focus-visible:ring-red-500'
        )}
        aria-label="Educational content input"
        aria-describedby="word-counter"
      />
      
      <div 
        id="word-counter" 
        className={cn(
          'text-sm text-right transition-colors',
          state === 'normal' && 'text-muted-foreground',
          state === 'warning' && 'text-yellow-700 dark:text-yellow-500 font-medium',
          state === 'error' && 'text-red-700 dark:text-red-500 font-semibold'
        )}
      >
        {wordCount.toLocaleString()} / 10,000 words
        {state === 'error' && ' - Content exceeds limit'}
      </div>
    </div>
  )
}
