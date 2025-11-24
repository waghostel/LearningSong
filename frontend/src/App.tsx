import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TextInputPage } from '@/pages/TextInputPage'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Main text input page */}
          <Route path="/" element={<TextInputPage />} />
          
          {/* Placeholder for lyrics editing page */}
          <Route 
            path="/lyrics-edit" 
            element={
              <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                  <h1 className="text-3xl font-bold">Lyrics Editing Page</h1>
                  <p className="text-muted-foreground">Coming soon...</p>
                </div>
              </div>
            } 
          />

          {/* 404 Not Found */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                  <h1 className="text-4xl font-bold">404</h1>
                  <p className="text-muted-foreground">Page not found</p>
                  <Button asChild>
                    <a href="/">Go Home</a>
                  </Button>
                </div>
              </div>
            } 
          />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
