import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useTextInputStore } from '@/stores/textInputStore'
import { cn } from '@/lib/utils'

export function TextInputArea() {
  const { content, setContent } = useTextInputStore()

  // Calculate word count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  // Determine visual state
  const getState = () => {
    if (wordCount > 10000) return 'error'
    if (wordCount >= 9000) return 'warning'
    return 'normal'
  }

  const state = getState()

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardContent className="p-4 flex-1 flex flex-col min-h-0 gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste or type your educational content here..."
          className={cn(
            'flex-1 min-h-[150px] resize-none transition-colors',
            state === 'warning' && 'border-yellow-500 focus-visible:ring-yellow-500',
            state === 'error' && 'border-red-500 focus-visible:ring-red-500'
          )}
          aria-label="Educational content input"
          aria-describedby="word-counter"
        />
        
        <div 
          id="word-counter" 
          className={cn(
            'text-sm text-right transition-colors shrink-0',
            state === 'normal' && 'text-muted-foreground',
            state === 'warning' && 'text-yellow-700 dark:text-yellow-500 font-medium',
            state === 'error' && 'text-red-700 dark:text-red-500 font-semibold'
          )}
        >
          {wordCount.toLocaleString()} / 10,000 words
          {state === 'error' && ' - Content exceeds limit'}
        </div>
      </CardContent>
    </Card>
  )
}
