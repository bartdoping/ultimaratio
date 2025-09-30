// components/theme-toggle.tsx
"use client"

import { useEffect, useState } from "react"

type Mode = "light" | "dark"

function applyMode(mode: Mode) {
  const root = document.documentElement
  if (mode === "dark") root.classList.add("dark")
  else root.classList.remove("dark")
  try {
    localStorage.setItem("theme", mode)
  } catch {}
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem("theme")
      if (stored === "dark" || stored === "light") {
        setMode(stored)
        applyMode(stored)
        return
      }
    } catch {}
    const isDark = document.documentElement.classList.contains("dark")
    const m: Mode = isDark ? "dark" : "light"
    setMode(m)
    applyMode(m)
  }, [])

  // Verhindere Hydration Mismatch durch SSR
  if (!mounted) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted focus:outline-none focus:ring"
        disabled
      >
        <span className="relative h-4 w-4 inline-block">
          <svg
            viewBox="0 0 24 24"
            className="absolute inset-0 h-4 w-4 opacity-100"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M6.76 4.84 5.34 3.42 3.92 4.84l1.42 1.42 1.42-1.42Zm10.48 0 1.42-1.42L18.24 3.4l-1.42 1.42 1.42 1.42ZM12 4c.55 0 1-.45 1-1V1a1 1 0 1 0-2 0v2c0 .55.45 1 1 1Zm8 7c0-.55.45-1 1-1h2a1 1 0 1 1 0 2h-2c-.55 0-1-.45-1-1ZM12 20a1 1 0 0 0-1 1v2a1 1 0 1 0 2 0v-2c0-.55-.45-1-1-1ZM2 12c0-.55-.45-1-1-1H-1a1 1 0 1 0 0 2h2c.55 0 1-.45 1-1Zm4.76 7.16L5.34 20.6l-1.42 1.42 1.42 1.42 1.42-1.42-1.42-1.42Zm12.9 0L18.24 20.6l1.42 1.42 1.42-1.42-1.42-1.42ZM12 6.5A5.5 5.5 0 1 0 12 17.5 5.5 5.5 0 0 0 12 6.5Z" />
          </svg>
        </span>
        <span className="hidden sm:inline">Light</span>
      </button>
    )
  }

  const isDark = mode === "dark"
  const toggle = () => {
    const next: Mode = isDark ? "light" : "dark"
    setMode(next)
    applyMode(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted focus:outline-none focus:ring"
      title={isDark ? "Light Mode aktivieren" : "Dark Mode aktivieren"}
      aria-label={isDark ? "Dark Mode ist aktiv – auf Light wechseln" : "Light Mode ist aktiv – auf Dark wechseln"}
    >
      <span className="relative h-4 w-4 inline-block">
        {/* Sonne */}
        <svg
          viewBox="0 0 24 24"
          className={`absolute inset-0 h-4 w-4 transition-opacity ${isDark ? "opacity-0" : "opacity-100"}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6.76 4.84 5.34 3.42 3.92 4.84l1.42 1.42 1.42-1.42Zm10.48 0 1.42-1.42L18.24 3.4l-1.42 1.42 1.42 1.42ZM12 4c.55 0 1-.45 1-1V1a1 1 0 1 0-2 0v2c0 .55.45 1 1 1Zm8 7c0-.55.45-1 1-1h2a1 1 0 1 1 0 2h-2c-.55 0-1-.45-1-1ZM12 20a1 1 0 0 0-1 1v2a1 1 0 1 0 2 0v-2c0-.55-.45-1-1-1ZM2 12c0-.55-.45-1-1-1H-1a1 1 0 1 0 0 2h2c.55 0 1-.45 1-1Zm4.76 7.16L5.34 20.6l-1.42 1.42 1.42 1.42 1.42-1.42-1.42-1.42Zm12.9 0L18.24 20.6l1.42 1.42 1.42-1.42-1.42-1.42ZM12 6.5A5.5 5.5 0 1 0 12 17.5 5.5 5.5 0 0 0 12 6.5Z" />
        </svg>
        {/* Mond */}
        <svg
          viewBox="0 0 24 24"
          className={`absolute inset-0 h-4 w-4 transition-opacity ${isDark ? "opacity-100" : "opacity-0"}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 0 1 11.21 3a7 7 0 1 0 9.79 9.79ZM12 22a10 10 0 0 1-9.95-9 1 1 0 0 1 1.37-1.03A8 8 0 0 0 12 20.58 1 1 0 0 1 12 22Z" />
        </svg>
      </span>
      <span className="hidden sm:inline">{isDark ? "Dark" : "Light"}</span>
    </button>
  )
}