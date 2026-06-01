"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  FONT_SCALE_DEFAULT,
  fontScaleHtmlSize,
  type FontScale,
} from "@/lib/font-scale"

const OPTIONS: Array<{ value: FontScale; label: string; hint: string }> = [
  { value: "small", label: "Klein", hint: "Mehr Inhalt sichtbar" },
  { value: "normal", label: "Normal", hint: "Empfohlen" },
  { value: "large", label: "Groß", hint: "Augen-freundlich" },
]

type Props = {
  initialScale?: FontScale
}

export function FontScalePicker({ initialScale = FONT_SCALE_DEFAULT }: Props) {
  const router = useRouter()
  const [scale, setScale] = useState<FontScale>(initialScale)
  const [pending, setPending] = useState<FontScale | null>(null)

  async function apply(next: FontScale) {
    if (pending || next === scale) return
    setPending(next)

    // Sofort optisch anwenden, damit der User Feedback bekommt.
    if (typeof document !== "undefined") {
      const html = document.documentElement
      html.style.fontSize = fontScaleHtmlSize(next)
      html.dataset.fontScale = next
    }

    try {
      const res = await fetch("/api/account/font-scale", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scale: next }),
      })
      if (!res.ok) {
        toast.error("Konnte Schriftgröße nicht speichern.")
        // Zurückrollen.
        if (typeof document !== "undefined") {
          document.documentElement.style.fontSize = fontScaleHtmlSize(scale)
          document.documentElement.dataset.fontScale = scale
        }
        return
      }
      setScale(next)
      toast.success("Schriftgröße aktualisiert.")
      // Server-Komponenten neu rendern, damit die Cookie-basierte SSR-Skalierung greift.
      router.refresh()
    } catch {
      toast.error("Netzwerkfehler beim Speichern.")
    } finally {
      setPending(null)
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Schriftgröße"
      className="grid grid-cols-1 gap-2 sm:grid-cols-3"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === scale
        const busy = pending === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={pending !== null}
            onClick={() => apply(opt.value)}
            className={cn(
              "flex items-start justify-between gap-3 rounded-xl border bg-background px-4 py-3 text-left transition-colors",
              active
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "hover:bg-muted/40",
              pending !== null && !busy && "opacity-50"
            )}
          >
            <div>
              <div
                className={cn(
                  "font-semibold",
                  opt.value === "small" && "text-sm",
                  opt.value === "large" && "text-lg"
                )}
              >
                {opt.label}
              </div>
              <div className="text-xs text-muted-foreground">{opt.hint}</div>
            </div>
            <span
              className={cn(
                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                active && !busy && "border-primary bg-primary text-primary-foreground",
                busy && "border-primary/60"
              )}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : active ? (
                <Check className="h-3.5 w-3.5" />
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
