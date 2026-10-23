"use client"

import { useState } from "react"
import { Check, Copy, Gift, Share2 } from "lucide-react"
import { trackClient } from "@/lib/track-client"

/**
 * Einladen: ein Monat Pro für beide, sobald die eingeladene Person wirklich
 * kreuzt. Teilen über das System-Menü (Handy) oder Kopieren.
 */
export function ReferralCard({
  link,
  eingeladen,
  belohnt,
  bonusUntil,
}: {
  link: string
  eingeladen: number
  belohnt: number
  bonusUntil: string | null
}) {
  const [kopiert, setKopiert] = useState(false)
  const text = "Ich kreuze meine Prüfungsfragen mit fragenkreuzen — mit dem Link bekommen wir beide einen Monat Pro:"

  async function teilen() {
    trackClient("share_copied", { was: "einladung" })
    if (navigator.share) {
      try {
        await navigator.share({ title: "fragenkreuzen", text, url: link })
        return
      } catch {
        // abgebrochen → kopieren
      }
    }
    await kopieren()
  }

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(link)
      setKopiert(true)
      window.setTimeout(() => setKopiert(false), 2000)
    } catch {
      // gesperrt
    }
  }

  return (
    <section id="einladen" className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Gift className="h-5 w-5 text-primary" aria-hidden /> Freunde einladen
        </h2>
        <p className="text-sm text-muted-foreground">
          Sobald jemand über deinen Link ein Konto anlegt und 20 Fragen kreuzt, bekommt ihr beide einen Monat Pro.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="h-11 min-w-0 flex-1 rounded-lg border bg-muted/30 px-3 text-sm"
          aria-label="Dein Einladungslink"
        />
        <button
          type="button"
          onClick={kopieren}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border hover:bg-muted"
          aria-label="Link kopieren"
        >
          {kopiert ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      <button
        type="button"
        onClick={teilen}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground"
      >
        <Share2 className="h-4 w-4" aria-hidden /> Link teilen
      </button>

      <p className="text-xs text-muted-foreground tabular-nums">
        {eingeladen} eingeladen · {belohnt} belohnt
        {bonusUntil && ` · Pro geschenkt bis ${new Date(bonusUntil).toLocaleDateString("de-DE")}`}
      </p>
    </section>
  )
}
