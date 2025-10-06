"use client"

import { useLoading } from "@/components/loading-spinner"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

export function AutoLoading() {
  const { setLoading } = useLoading()
  const pathname = usePathname()

  useEffect(() => {
    // Loading beim Seitenwechsel automatisch beenden
    setLoading(false)
  }, [pathname, setLoading])

  // Automatisches Loading für alle Link-Klicks
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      
      if (link && link.href) {
        const url = new URL(link.href, window.location.origin)
        const currentPath = window.location.pathname
        
        // Nur bei internen Links und wenn es ein anderer Pfad ist
        if (url.origin === window.location.origin && url.pathname !== currentPath) {
          setLoading(true)
        }
      }
    }

    // Event Listener hinzufügen
    document.addEventListener('click', handleLinkClick)
    
    return () => {
      document.removeEventListener('click', handleLinkClick)
    }
  }, [setLoading])

  return null
}
