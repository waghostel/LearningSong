import { useEffect, useRef, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTextInputStore, type PipelineStage } from '@/stores/textInputStore'
import { X } from 'lucide-react'

const STAGE_INFO: Record<PipelineStage, { label: string; progress: number; estimatedTime: number }> = {
  cleaning: { label: 'Cleaning text...', progress: 20, estimatedTime: 5 },
  searching: { label: 'Searching for context...', progress: 40, estimatedTime: 10 },
  summarizing: { label: 'Summarizing content...', progress: 60, estimatedTime: 8 },
  validating: { label: 'Validating summary...', progress: 80, estimatedTime: 2 },
  converting: { label: 'Converting to lyrics...', progress: 90, estimatedTime: 5 },
}

export function LoadingProgress() {
  const { isGenerating, currentStage, searchEnabled } = useTextInputStore()
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const timerRef = useRef<number>(0)

  useEffect(() => {
    if (!isGenerating || !currentStage) {
      timerRef.current = 0
      return
    }

    // Calculate estimated time based on current stage
    let totalTime = 0
    const stages: PipelineStage[] = ['cleaning', 'summarizing', 'validating', 'converting']
    if (searchEnabled) {
      stages.splice(1, 0, 'searching')
    }

    const currentIndex = stages.indexOf(currentStage)
    for (let i = currentIndex; i < stages.length; i++) {
      totalTime += STAGE_INFO[stages[i]].estimatedTime
    }

    // Store in ref to avoid cascading renders
    timerRef.current = totalTime

    // Countdown timer
    const interval = setInterval(() => {
      timerRef.current = Math.max(0, timerRef.current - 1)
      setTimeRemaining(timerRef.current)
      
      if (timerRef.current === 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [currentStage, searchEnabled, isGenerating])

  if (!isGenerating || !currentStage) {
    return null
  }

  const stageInfo = STAGE_INFO[currentStage]

  return (
    <Card 
      className="bg-muted/50"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Lyrics generation progress"
    >
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium" aria-live="polite">
              {stageInfo.label}
            </p>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              Estimated time remaining: {timeRemaining} seconds
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // TODO: Implement cancel functionality
            }}
            className="h-8 w-8"
            aria-label="Cancel lyrics generation"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <Progress 
          value={stageInfo.progress} 
          className="h-2"
          aria-label={`Generation progress: ${stageInfo.progress}%`}
        />

        <div 
          className="flex justify-between text-xs text-muted-foreground"
          role="list"
          aria-label="Pipeline stages"
        >
          <span 
            className={currentStage === 'cleaning' ? 'font-medium text-foreground' : ''}
            role="listitem"
            aria-current={currentStage === 'cleaning' ? 'step' : undefined}
          >
            Clean
          </span>
          {searchEnabled && (
            <span 
              className={currentStage === 'searching' ? 'font-medium text-foreground' : ''}
              role="listitem"
              aria-current={currentStage === 'searching' ? 'step' : undefined}
            >
              Search
            </span>
          )}
          <span 
            className={currentStage === 'summarizing' ? 'font-medium text-foreground' : ''}
            role="listitem"
            aria-current={currentStage === 'summarizing' ? 'step' : undefined}
          >
            Summarize
          </span>
          <span 
            className={currentStage === 'validating' ? 'font-medium text-foreground' : ''}
            role="listitem"
            aria-current={currentStage === 'validating' ? 'step' : undefined}
          >
            Validate
          </span>
          <span 
            className={currentStage === 'converting' ? 'font-medium text-foreground' : ''}
            role="listitem"
            aria-current={currentStage === 'converting' ? 'step' : undefined}
          >
            Convert
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
