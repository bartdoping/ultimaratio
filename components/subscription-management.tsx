"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"

interface SubscriptionData {
  status: "free" | "pro"
  isPro: boolean
  subscriptionDetails?: {
    status: string
    currentPeriodStart?: string
    currentPeriodEnd?: string
    cancelAtPeriodEnd: boolean
  }
  nextPaymentDate?: string
  cancelAtPeriodEnd?: boolean
  periodStart?: string
  periodEnd?: string
  daysRemaining?: number | null
  isSimulated?: boolean
}

const PRO_FEATURES = [
  "Unbegrenztes Üben pro Tag",
  "Alle Prüfungsfragen",
  "Eigene Decks & Spaced Repetition",
  "Detaillierte Statistiken",
  "KI-Tutor-Unterstützung",
] as const

function formatDate(value?: string) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function SubscriptionManagement() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/subscription/status", {
        credentials: "include",
      })
      const data = await response.json()

      if (data.ok) {
        setSubscription(data.subscription)
      } else {
        console.error("subscription status:", data.error)
      }
    } catch (error) {
      console.error("Failed to fetch subscription status:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSubscriptionStatus()
  }, [fetchSubscriptionStatus])

  useEffect(() => {
    const onUpdate = () => {
      setLoading(true)
      void fetchSubscriptionStatus()
    }
    window.addEventListener("fragenkreuzen:subscription-updated", onUpdate)
    return () =>
      window.removeEventListener("fragenkreuzen:subscription-updated", onUpdate)
  }, [fetchSubscriptionStatus])

  const handleUpgrade = async () => {
    setActionLoading(true)
    try {
      const response = await fetch("/api/stripe/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const data = await response.json()

      if (data.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error("Abo konnte nicht gestartet werden", {
          description: data.details || data.error || "Unbekannter Fehler",
        })
      }
    } catch (error) {
      toast.error("Fehler beim Upgrade", {
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (
      !confirm(
        "Abonnement zum Ende der aktuellen Abrechnungsperiode kündigen?\n\n" +
          "Pro bleibt bis zum letzten Tag der laufenden Periode aktiv."
      )
    ) {
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch("/api/stripe/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const data = await response.json()

      if (data.ok) {
        let msg =
          "Kündigung eingetragen. Pro bleibt bis zum Ende der bezahlten Laufzeit aktiv."
        const end = formatDate(data.currentPeriodEnd)
        if (end) msg += ` Nutzbar bis einschließlich ${end}.`
        toast.success("Kündigung eingetragen", { description: msg })
        fetchSubscriptionStatus()
      } else {
        const detail = typeof data.details === "string" ? data.details : data.error
        toast.error("Kündigung fehlgeschlagen", { description: detail || "Unbekannter Fehler" })
      }
    } catch (error) {
      toast.error("Fehler beim Kündigen", {
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivate = async () => {
    if (!confirm("Abonnement reaktivieren? Die automatische Verlängerung wird wieder aktiv.")) {
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch("/api/stripe/subscription/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      const data = await response.json()

      if (data.ok) {
        toast.success("Abonnement reaktiviert", {
          description: "Die automatische Verlängerung ist wieder aktiv.",
        })
        fetchSubscriptionStatus()
      } else {
        toast.error("Reaktivierung fehlgeschlagen", {
          description: data.error || "Unbekannter Fehler",
        })
      }
    } catch (error) {
      toast.error("Fehler beim Reaktivieren", {
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
        Abo-Status wird geladen…
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
        Abo-Daten konnten nicht geladen werden. Bitte Seite neu laden.
      </div>
    )
  }

  const periodEnd =
    formatDate(subscription.nextPaymentDate) ||
    formatDate(subscription.subscriptionDetails?.currentPeriodEnd)
  const periodStart = formatDate(subscription.periodStart)
  const isCancelling =
    subscription.cancelAtPeriodEnd || subscription.subscriptionDetails?.cancelAtPeriodEnd

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Aktueller Tarif
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {subscription.isPro ? "Pro" : "Kostenlos"}
              </h2>
              <Badge variant={subscription.isPro ? "default" : "outline"}>
                {subscription.isPro ? "Aktiv" : "Free"}
              </Badge>
              {subscription.isPro && isCancelling && (
                <Badge variant="secondary">Endet bald</Badge>
              )}
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">
              {subscription.isPro
                ? "Voller Zugriff auf Training, Decks, Spaced Repetition und alle Prüfungsinhalte."
                : "Upgrade auf Pro für unbegrenztes Üben, eigene Decks und erweiterte Lernfunktionen."}
            </p>
          </div>

          {!subscription.isPro && (
            <div className="shrink-0 text-left sm:text-right">
              <div className="text-3xl font-bold text-primary">9,99 €</div>
              <div className="text-xs text-muted-foreground">pro Monat · monatlich kündbar</div>
            </div>
          )}
        </div>

        {subscription.isPro && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/25 px-3 py-2.5">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="mt-0.5 text-sm font-medium">
                {isCancelling ? "Kündigung aktiv" : "Aktiv"}
              </div>
            </div>
            {periodEnd && (
              <div className="rounded-lg border bg-muted/25 px-3 py-2.5">
                <div className="text-xs text-muted-foreground">
                  {isCancelling ? "Pro endet am" : "Nächste Abrechnung"}
                </div>
                <div className="mt-0.5 text-sm font-medium">{periodEnd}</div>
              </div>
            )}
            {periodStart && (
              <div className="rounded-lg border bg-muted/25 px-3 py-2.5">
                <div className="text-xs text-muted-foreground">Laufzeit seit</div>
                <div className="mt-0.5 text-sm font-medium">{periodStart}</div>
              </div>
            )}
          </div>
        )}

        {subscription.isPro && isCancelling && (
          <Alert className="mt-4">
            <AlertDescription>
              Dein Abo ist gekündigt und läuft{periodEnd ? ` bis ${periodEnd}` : " zum Periodenende"}.
              {subscription.daysRemaining != null && subscription.daysRemaining > 0 && (
                <> Noch {subscription.daysRemaining} Tage Pro-Zugang.</>
              )}{" "}
              Du kannst die Kündigung jederzeit zurücknehmen.
            </AlertDescription>
          </Alert>
        )}

        {subscription.isSimulated && (
          <p className="mt-3 text-xs text-muted-foreground rounded-lg border bg-muted/20 px-3 py-2">
            Entwicklungsmodus: simuliertes Abo ohne echten Stripe-Checkout.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground max-w-md">
            {subscription.isPro
              ? isCancelling
                ? "Mit „Wiederherstellen“ läuft die Verlängerung normal weiter."
                : "Kündigung stoppt nur die Verlängerung – Pro bleibt bis Periodenende aktiv."
              : "Alle bisherigen Daten und Statistiken bleiben beim Wechsel erhalten."}
          </p>
          <div className="flex flex-wrap gap-2 shrink-0">
            {subscription.isPro ? (
              isCancelling ? (
                <Button
                  onClick={handleReactivate}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {actionLoading ? "Wird reaktiviert…" : "Abo wiederherstellen"}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Wird gekündigt…" : "Abo kündigen"}
                </Button>
              )
            ) : (
              <Button
                onClick={handleUpgrade}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? "Wird verarbeitet…" : "Jetzt Pro aktivieren"}
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Was Pro enthält</h2>
        <p className="mt-1 text-sm text-muted-foreground mb-4">
          Alle Leistungen im Überblick.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {PRO_FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
            >
              <span className="text-green-600 dark:text-green-400" aria-hidden>
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <Alert>
        <AlertDescription>
          Fragen oder Probleme mit der Abrechnung? Schreib uns – dein Lernfortschritt bleibt
          unabhängig vom Tarif erhalten.
        </AlertDescription>
      </Alert>
    </div>
  )
}
