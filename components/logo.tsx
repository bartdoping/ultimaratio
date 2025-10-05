"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function Logo() {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Fallback während Hydration
    return (
      <img 
        src="/logo/fragenkreuzen logo transparent.png" 
        alt="fragenkreuzen.de Logo" 
        className="h-8 w-8"
      />
    )
  }

  // Bestimme das richtige Logo basierend auf dem Theme
  const logoSrc = resolvedTheme === "dark" 
    ? "/logo/fragenkreuzen logo weiß.png"
    : "/logo/fragenkreuzen logo transparent.png"

  return (
    <img 
      src={logoSrc} 
      alt="fragenkreuzen.de Logo" 
      className="h-8 w-8"
    />
  )
}
