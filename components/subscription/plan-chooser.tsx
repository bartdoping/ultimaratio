"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { trackClient } from "@/lib/track-client"

export type PlanChoice = {
  plan: "pro_monthly" | "exam_pass" | "year_pass"
  /** z. B. "9,99 €" — leer, wenn Stripe den Betrag nicht geliefert hat. */
  price: string
  suffix: string
  hint?: string
}

const TITEL: Record<PlanChoice["plan"], string> = {
  pro_monthly: "Monatlich",
  exam_pass: "Examenspass",
  year_pass: "Jahrespass",
}

/**
 * Tarifwahl direkt am Ort des Bedarfs (Kontingent erreicht, Preisseite).
 * Ein Tipp → Stripe-Checkout. Ohne Konto geht es erst zur Anmeldung.
 */
export function PlanChooser({
  choices,
  isLoggedIn,
  returnTo,
  className,
}: {
  choices: PlanChoice[]
  isLoggedIn: boolean
  returnTo: "/kreuzen" | "/generator"
  className?: string
}) {
  const router = useRouter()
  const [laedt, setLaedt] = useState<string | null>(null)

  async function waehlen(plan: PlanChoice["plan"]) {
    trackClient("upgrade_clicked", { from: returnTo.slice(1), plan })
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(returnTo)}`)
      return
    }
    setLaedt(plan)
    try {
      const res = await fetch("/api/stripe/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan, returnTo }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.url) {
        window.location.href = d.url
        return
      }
      toast.error(
        d.error === "already_pro"
          ? "Du hast bereits ein Pro-Abo."
          : d.error === "pass_active"
            ? `Dein Pro-Zugang läuft noch bis ${new Date(d.bis).toLocaleDateString("de-DE")} — ein Abo kannst du danach abschließen.`
            : "Checkout konnte nicht gestartet werden."
      )
    } catch {
      toast.error("Checkout konnte nicht gestartet werden.")
    } finally {
      setLaedt(null)
    }
  }

  if (choices.length === 0) return null
  return (
    <div className={cn("grid gap-2", choices.length === 2 && "sm:grid-cols-2", choices.length >= 3 && "sm:grid-cols-3", className)}>
      {choices.map((c, i) => (
        <button
          key={c.plan}
          type="button"
          onClick={() => waehlen(c.plan)}
          disabled={laedt !== null}
          className={cn(
            "rounded-2xl border p-4 text-left transition-colors disabled:opacity-60",
            i === 0 ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted/50"
          )}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold">{TITEL[c.plan]}</span>
            {c.hint && (
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", i === 0 ? "bg-primary-foreground/20" : "bg-primary/10 text-primary")}>
                {c.hint}
              </span>
            )}
          </div>
          <div className="mt-1 text-xl font-bold tabular-nums">
            {laedt === c.plan ? "Wird geöffnet …" : c.price || "Pro"}
            {laedt !== c.plan && c.suffix && <span className="text-sm font-normal opacity-80"> {c.suffix}</span>}
          </div>
        </button>
      ))}
    </div>
  )
}
