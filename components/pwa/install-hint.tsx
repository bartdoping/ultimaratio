"use client"

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const KEY = "fragenkreuzen:install-hint"

/**
 * "Als App installieren" — erst, wenn jemand wirklich kreuzt, und nur bis er
 * es einmal wegklickt. Android/Chrome: echter Installationsdialog. iPhone:
 * kurzer Hinweis auf "Teilen → Zum Home-Bildschirm" (Safari bietet keinen Dialog).
 */
export function InstallHint() {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null)
  const [ios, setIos] = useState(false)
  const [sichtbar, setSichtbar] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true
    let weg = false
    try {
      weg = localStorage.getItem(KEY) === "weg"
    } catch {
      // egal
    }
    if (standalone || weg) return
    const istIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)
    if (istIos) {
      setIos(true)
      setSichtbar(true)
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as PromptEvent)
      setSichtbar(true)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])

  function schliessen() {
    setSichtbar(false)
    try {
      localStorage.setItem(KEY, "weg")
    } catch {
      // egal
    }
  }

  if (!sichtbar) return null
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-3">
      <Download className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium">fragenkreuzen als App</div>
        <div className="text-muted-foreground">
          {ios ? "Teilen-Symbol → „Zum Home-Bildschirm“. Startet wie eine App, Vorrat auch im Funkloch." : "Ein Tipp auf dem Homescreen, Vorrat auch im Funkloch."}
        </div>
      </div>
      {prompt && (
        <button
          type="button"
          onClick={async () => {
            await prompt.prompt().catch(() => {})
            setPrompt(null)
            schliessen()
          }}
          className="h-9 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Installieren
        </button>
      )}
      <button type="button" onClick={schliessen} aria-label="Hinweis schließen" className="tap-target shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
