// components/theme-toggle.tsx
"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon, Monitor } from "lucide-react"

const ORDER = ["light", "dark", "system"] as const
type ThemeKey = (typeof ORDER)[number]

function nextTheme(current: string | undefined): ThemeKey {
  const idx = ORDER.indexOf((current as ThemeKey) ?? "system")
  if (idx < 0) return "light"
  return ORDER[(idx + 1) % ORDER.length]
}

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Bei nicht-eingegebenen Feldern: Shift+D zum Toggle (Power-User).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.shiftKey || (e.key !== "D" && e.key !== "d")) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      setTheme(nextTheme(theme))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [theme, setTheme])

  if (!mounted) {
    return (
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm hover:bg-muted focus:outline-none focus:ring"
        aria-label="Theme wird geladen"
        disabled
      >
        <Sun className="h-4 w-4 opacity-60" aria-hidden="true" />
      </button>
    )
  }

  const current: ThemeKey = (theme as ThemeKey) ?? "system"
  const next = nextTheme(theme)
  const tipMap: Record<ThemeKey, string> = {
    light: "Light Mode aktiv — Klick wechselt zu Dark (Shift+D)",
    dark: "Dark Mode aktiv — Klick wechselt zu System (Shift+D)",
    system: `System (gerade ${resolvedTheme === "dark" ? "Dark" : "Light"}) — Klick wechselt zu Light (Shift+D)`,
  }

  const Icon =
    current === "system" ? Monitor : current === "dark" ? Moon : Sun

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={tipMap[current]}
      title={tipMap[current]}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm transition-colors hover:bg-muted focus:outline-none focus:ring"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">Theme wechseln</span>
    </button>
  )
}
