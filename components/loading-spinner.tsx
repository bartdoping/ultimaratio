"use client"

import { createContext, useContext, useEffect, useState } from "react"

// Loading Context
const LoadingContext = createContext<{
  isLoading: boolean
  setLoading: (loading: boolean) => void
}>({
  isLoading: false,
  setLoading: () => {}
})

export function useLoading() {
  return useContext(LoadingContext)
}

// Loading Provider
export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)

  // Automatisches Ende des Loadings nach 3 Sekunden (Fallback)
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading: setIsLoading }}>
      {children}
      <LoadingSpinner isLoading={isLoading} />
    </LoadingContext.Provider>
  )
}

// Loading Spinner Component
function LoadingSpinner({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-3">
        {/* Spinner - effiziente CSS-Animation */}
        <div className="relative">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary"></div>
        </div>
        
        {/* Text */}
        <div className="text-sm text-muted-foreground font-medium animate-pulse">
          Lädt...
        </div>
      </div>
    </div>
  )
}
