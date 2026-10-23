"use client"

import { useState } from "react"
import { Check, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { trackClient } from "@/lib/track-client"

/**
 * Teilen über das System-Menü (Handy: WhatsApp, Insta, Lerngruppe …),
 * sonst Link kopieren. Im Chat erscheint die Frage als Bildvorschau.
 */
export function ShareButton({
  url,
  text,
  className,
  compact = false,
}: {
  url: string
  text: string
  className?: string
  compact?: boolean
}) {
  const [kopiert, setKopiert] = useState(false)

  async function teilen() {
    trackClient("share_copied", { was: "frage" })
    if (navigator.share) {
      try {
        await navigator.share({ title: "fragenkreuzen", text, url })
        return
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setKopiert(true)
      window.setTimeout(() => setKopiert(false), 2000)
    } catch {
      // gesperrt
    }
  }

  return (
    <button
      type="button"
      onClick={teilen}
      className={cn(
        compact
          ? "tap-target inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          : "inline-flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-medium hover:bg-muted",
        className
      )}
    >
      {kopiert ? <Check className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden /> : <Share2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />}
      {kopiert ? "Link kopiert" : compact ? "Teilen" : "Frage teilen"}
    </button>
  )
}
