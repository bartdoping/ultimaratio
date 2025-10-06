"use client"

import { useLoading } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"

export function LoadingTest() {
  const { setLoading } = useLoading()

  const testLoading = () => {
    setLoading(true)
    // Automatisch nach 2 Sekunden beenden
    setTimeout(() => {
      setLoading(false)
    }, 2000)
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <Button 
        onClick={testLoading}
        variant="outline"
        size="sm"
        className="bg-background/80 backdrop-blur-sm"
      >
        Test Loading
      </Button>
    </div>
  )
}
