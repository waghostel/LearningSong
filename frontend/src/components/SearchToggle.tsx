import { useTextInputStore } from '@/stores/textInputStore'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'

export function SearchToggle() {
  const { searchEnabled, toggleSearch } = useTextInputStore()

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex-1 space-y-1 text-left">
            <Label 
              htmlFor="google-search-toggle"
              className="text-sm font-medium leading-none"
            >
              Enrich with Google Search
            </Label>
            <p id="search-toggle-description" className="text-sm text-muted-foreground">
              Use Google Search to add relevant context to short content. This may increase processing time by 5-10 seconds.
            </p>
          </div>
          <Switch
            id="google-search-toggle"
            checked={searchEnabled}
            onCheckedChange={toggleSearch}
            aria-label="Toggle Google Search grounding"
            aria-describedby="search-toggle-description"
          />
        </div>
      </CardContent>
    </Card>
  )
}
