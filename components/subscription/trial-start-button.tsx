"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"

type Props = {
  className?: string
  size?: "sm" | "default" | "lg"
  variant?: "default" | "secondary" | "outline" | "ghost"
  /** Text-Override. Default: "7 Tage Pro gratis testen" */
  label?: string
  /** Wenn true: zeigt Sparkles-Icon links vom Text. */
  showIcon?: boolean
  /** Callback nach Erfolg (z. B. Modal schließen). */
  onStarted?: () => void
}

/**
 * Startet die 7-Tage-Pro-Testphase ohne Zahlungsdaten.
 * Bei Erfolg wird der Router refreshed, damit Server-Komponenten den neuen
 * Pro-Status sofort sehen.
 */
export function TrialStartButton({
  className,
  size = "default",
  variant = "default",
  label = "7 Tage Pro gratis testen",
  showIcon = true,
  onStarted,
}: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const res = await fetch("/api/subscription/trial", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        message?: string
      }
      if (!res.ok || !data.ok) {
        setError(data.message || data.error || "Trial konnte nicht gestartet werden.")
        setPending(false)
        return
      }
      onStarted?.()
      // Router-Refresh, damit Pro-Status überall (auch in Server-Komponenten) gilt.
      router.refresh()
    } catch {
      setError("Verbindungsfehler. Bitte erneut versuchen.")
      setPending(false)
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={start}
        disabled={pending}
        aria-label="Kostenlose Pro-Testphase starten"
      >
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : showIcon ? (
          <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
        ) : null}
        {pending ? "Wird aktiviert…" : label}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
