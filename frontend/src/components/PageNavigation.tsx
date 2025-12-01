import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface NavItem {
  path: string
  label: string
  shortLabel: string
}

const navItems: NavItem[] = [
  { path: '/', label: 'Text Input', shortLabel: 'Input' },
  { path: '/lyrics-edit', label: 'Lyrics Editing', shortLabel: 'Lyrics' },
  { path: '/playback', label: 'Song Playback', shortLabel: 'Playback' },
]

export function PageNavigation() {
  const location = useLocation()
  
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-2">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={cn(
            'px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-md transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isActive(item.path)
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground'
          )}
          aria-current={isActive(item.path) ? 'page' : undefined}
        >
          <span className="hidden sm:inline">{item.label}</span>
          <span className="sm:hidden">{item.shortLabel}</span>
        </Link>
      ))}
    </nav>
  )
}
