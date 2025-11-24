import { Switch } from '@/components/ui/switch'
import { useTextInputStore } from '@/stores/textInputStore'

export function SearchToggle() {
  const { searchEnabled, toggleSearch } = useTextInputStore()

  return (
    <div className="flex items-center justify-between space-x-4 rounded-lg border p-4" role="group" aria-labelledby="search-toggle-label">
      <div className="flex-1 space-y-1">
        <label 
          id="search-toggle-label"
          htmlFor="search-toggle" 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Enrich with Google Search
        </label>
        <p id="search-toggle-description" className="text-sm text-muted-foreground">
          Use Google Search to add relevant context to short content. This may increase processing time by 5-10 seconds.
        </p>
      </div>
      <Switch
        id="search-toggle"
        checked={searchEnabled}
        onCheckedChange={toggleSearch}
        aria-label="Toggle Google Search grounding"
        aria-describedby="search-toggle-description"
        role="switch"
        aria-checked={searchEnabled}
      />
    </div>
  )
}
