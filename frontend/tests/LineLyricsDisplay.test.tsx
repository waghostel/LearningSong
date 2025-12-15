import * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { LineLyricsDisplay } from '@/components/LineLyricsDisplay'
import type { LineCue } from '@/lib/vtt-generator'
import '@testing-library/jest-dom'

describe('LineLyricsDisplay', () => {
  const mockLineCues: LineCue[] = [
    {
      lineIndex: 0,
      text: 'First line of lyrics',
      startTime: 0,
      endTime: 5,
      isMarker: false
    },
    {
      lineIndex: 1,
      text: '**[Interlude]**',
      startTime: 5,
      endTime: 10,
      isMarker: true
    },
    {
      lineIndex: 2,
      text: 'Second line of lyrics',
      startTime: 10,
      endTime: 15,
      isMarker: false
    }
  ]

  const mockOnLineClick = jest.fn()
  const scrollIntoViewMock = jest.fn()

  beforeAll(() => {
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoViewMock
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when empty', () => {
    render(
      <LineLyricsDisplay 
        lineCues={[]} 
        currentTime={0} 
        onLineClick={mockOnLineClick} 
      />
    )
    expect(screen.getByText('No lyrics lines available')).toBeInTheDocument()
  })

  it('renders lines correctly', () => {
    render(
      <LineLyricsDisplay 
        lineCues={mockLineCues} 
        currentTime={0} 
        onLineClick={mockOnLineClick} 
      />
    )
    expect(screen.getByText('First line of lyrics')).toBeInTheDocument()
    expect(screen.getByText('**[Interlude]**')).toBeInTheDocument()
    expect(screen.getByText('Second line of lyrics')).toBeInTheDocument()
  })

  it('hides markers when showMarkers is false', () => {
    render(
      <LineLyricsDisplay 
        lineCues={mockLineCues} 
        currentTime={0} 
        onLineClick={mockOnLineClick} 
        showMarkers={false}
      />
    )
    expect(screen.getByText('First line of lyrics')).toBeInTheDocument()
    expect(screen.queryByText('**[Interlude]**')).not.toBeInTheDocument()
  })

  it('highlights current line based on time', () => {
    render(
      <LineLyricsDisplay 
        lineCues={mockLineCues} 
        currentTime={2.5} 
        onLineClick={mockOnLineClick} 
      />
    )
    
    const firstLine = screen.getByText('First line of lyrics')
    expect(firstLine).toHaveAttribute('aria-current', 'time')
    
    // Check class for highlighting (bg-primary/15 or similar unique class)
    // We can check if it has the highlighting class we added
    expect(firstLine.className).toContain('bg-primary/15')

    const secondLine = screen.getByText('Second line of lyrics')
    expect(secondLine).not.toHaveAttribute('aria-current')
  })

  it('calls onLineClick when a line is clicked', () => {
    render(
      <LineLyricsDisplay 
        lineCues={mockLineCues} 
        currentTime={0} 
        onLineClick={mockOnLineClick} 
      />
    )
    
    fireEvent.click(screen.getByText('Second line of lyrics'))
    expect(mockOnLineClick).toHaveBeenCalledWith(10)
  })

  it('scrolls active line into view', () => {
    render(
      <LineLyricsDisplay 
        lineCues={mockLineCues} 
        currentTime={2.5} 
        onLineClick={mockOnLineClick} 
      />
    )
    
    // We expect scrollIntoView to be called for the active element
    expect(scrollIntoViewMock).toHaveBeenCalled()
  })

  it('respects offset', () => {
    // Current time 8s. 
    // If offset is -4000ms (-4s), effective time is 4s.
    // 4s falls in first line (0-5).
    // so first line should be highlighted.
    render(
      <LineLyricsDisplay 
        lineCues={mockLineCues} 
        currentTime={8} 
        onLineClick={mockOnLineClick} 
        offset={-4000}
      />
    )
    
    const firstLine = screen.getByText('First line of lyrics')
    expect(firstLine).toHaveAttribute('aria-current', 'time')
  })
})
