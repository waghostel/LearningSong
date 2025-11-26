import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLyricsEditingStore } from '@/stores/lyricsEditingStore'
import { MusicStyle } from '@/api/songs'

interface StyleOption {
  value: MusicStyle
  label: string
  description: string
}

const MUSIC_STYLES: StyleOption[] = [
  { 
    value: MusicStyle.POP, 
    label: 'Pop', 
    description: 'Upbeat and catchy melodies perfect for memorable learning' 
  },
  { 
    value: MusicStyle.RAP, 
    label: 'Rap/Hip-Hop', 
    description: 'Rhythmic and fast-paced, great for memorizing facts' 
  },
  { 
    value: MusicStyle.FOLK, 
    label: 'Folk/Acoustic', 
    description: 'Gentle storytelling style with clear vocals' 
  },
  { 
    value: MusicStyle.ELECTRONIC, 
    label: 'Electronic/EDM', 
    description: 'Energetic and modern with electronic beats' 
  },
  { 
    value: MusicStyle.ROCK, 
    label: 'Rock', 
    description: 'Powerful and memorable with strong instrumentation' 
  },
  { 
    value: MusicStyle.JAZZ, 
    label: 'Jazz', 
    description: 'Smooth and sophisticated with complex harmonies' 
  },
  { 
    value: MusicStyle.CHILDREN, 
    label: "Children's Song", 
    description: 'Simple, fun, and easy to sing along' 
  },
  { 
    value: MusicStyle.CLASSICAL, 
    label: 'Classical/Orchestral', 
    description: 'Elegant and dramatic with orchestral arrangements' 
  },
]

export const StyleSelector: React.FC = () => {
  const { selectedStyle, setSelectedStyle } = useLyricsEditingStore()
  
  const selectedOption = MUSIC_STYLES.find(style => style.value === selectedStyle)
  
  const handleValueChange = (value: string) => {
    setSelectedStyle(value as MusicStyle)
  }
  
  // Generate unique IDs for ARIA attributes
  const labelId = 'style-selector-label'
  const descriptionId = 'style-selector-description'
  const helpId = 'style-selector-help'
  
  return (
    <div 
      className="space-y-2" 
      role="group" 
      aria-labelledby={labelId}
    >
      <label 
        id={labelId}
        htmlFor="style-selector" 
        className="text-sm font-medium"
      >
        Music Style
      </label>
      
      <Select 
        value={selectedStyle} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger 
          id="style-selector" 
          className="w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Select music style. Currently selected: ${selectedOption?.label || 'none'}`}
          aria-describedby={`${descriptionId} ${helpId}`}
        >
          <SelectValue placeholder="Select a music style" />
        </SelectTrigger>
        <SelectContent>
          {MUSIC_STYLES.map((style) => (
            <SelectItem 
              key={style.value} 
              value={style.value}
              aria-label={`${style.label}: ${style.description}`}
            >
              {style.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <p 
        id={descriptionId}
        className="text-sm text-muted-foreground"
        aria-live="polite"
        role="status"
      >
        {selectedOption 
          ? selectedOption.description 
          : 'Choose a music style for your song'
        }
      </p>
      
      <p id={helpId} className="sr-only">
        Use arrow keys to navigate options after opening the dropdown. Press Enter or Space to select.
      </p>
    </div>
  )
}
