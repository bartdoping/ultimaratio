// components/subscription-management.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  // Neue Abonnement-Daten
  nextPaymentDate?: string
  cancelAtPeriodEnd?: boolean
  periodStart?: string
  periodEnd?: string
  daysRemaining?: number | null
  isSimulated?: boolean
}

export function SubscriptionManagement() {
  const { data: session } = useSession()
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
        credentials: "include"
      })
      const data = await response.json()
      
      if (data.ok && data.url) {
        window.location.href = data.url
      } else {
        console.error("Upgrade failed:", data)
        toast.error("Abo konnte nicht gestartet werden", {
          description: data.details || data.error || "Unbekannter Fehler",
        })
      }
    } catch (error) {
      console.error("Upgrade failed:", error)
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
          "Du behältst Pro bis zum letzten Tag der laufenden Periode (wie bei Stripe üblich). " +
          "Erst danach wechselst du zum kostenlosen Tarif."
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
          "Kündigung ist eingetragen. Dein Pro-Zugang bleibt bis zum Ende der bezahlten Laufzeit aktiv."
        if (typeof data.currentPeriodEnd === "string") {
          const d = new Date(data.currentPeriodEnd)
          if (!Number.isNaN(d.getTime())) {
            msg += ` Pro ist nutzbar bis einschließlich ${d.toLocaleDateString("de-DE", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}.`
          }
        }
        toast.success("Kündigung eingetragen", { description: msg })
        fetchSubscriptionStatus()
      } else {
        console.error("Cancel failed:", data)
        const detail =
          typeof data.details === "string" ? data.details : data.error
        toast.error("Kündigung fehlgeschlagen", { description: detail || "Unbekannter Fehler" })
      }
    } catch (error) {
      console.error("Cancel failed:", error)
      toast.error("Fehler beim Kündigen des Abonnements", {
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivate = async () => {
    if (!confirm("Möchtest du dein Abonnement reaktivieren? Die automatische Verlängerung wird wieder aktiviert.")) {
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
        console.error("Reactivation failed:", data)
        toast.error("Reaktivierung fehlgeschlagen", {
          description: data.error || "Unbekannter Fehler",
        })
      }
    } catch (error) {
      console.error("Reactivation failed:", error)
      toast.error("Fehler beim Reaktivieren", {
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
        Abo-Status wird geladen...
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 shadow-sm dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
        Abo-Daten konnten nicht geladen werden.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Dein Tarif
            {subscription.isPro ? (
              <Badge variant="default" className="bg-green-600">
                Pro
              </Badge>
            ) : (
              <Badge variant="outline">Kostenlos</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {subscription.isPro
              ? "Du hast Zugriff auf Pro-Funktionen und alle freigeschalteten Lernbereiche."
              : "Du nutzt aktuell den kostenlosen Tarif. Pro erweitert Training, Decks und Wiederholung."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Subscription Details */}
      {subscription.isPro && subscription.subscriptionDetails && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Abonnement</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Status</div>
              <span className="font-medium">
                {subscription.subscriptionDetails.cancelAtPeriodEnd ? "Wird gekündigt" : "Aktiv"}
              </span>
            </div>
            {subscription.subscriptionDetails.currentPeriodEnd && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Läuft bis</div>
                <span className="font-medium">
                  {new Date(subscription.subscriptionDetails.currentPeriodEnd).toLocaleDateString("de-DE")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pro Features */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Pro-Features</CardTitle>
          <CardDescription>
            Was mit Pro freigeschaltet wird.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                <span className="text-green-600">✓</span>
                <span>Unbegrenzte Fragen pro Tag</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                <span className="text-green-600">✓</span>
                <span>Zugang zu allen Prüfungsfragen</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                <span className="text-green-600">✓</span>
                <span>Detaillierte Statistiken</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                <span className="text-green-600">✓</span>
                <span>Spaced Repetition System</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                <span className="text-green-600">✓</span>
                <span>Eigene Prüfungsdecks</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                <span className="text-green-600">✓</span>
                <span>KI-Tutor-Unterstützung</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className="border-primary/30 bg-primary/5 shadow-sm">
        <CardHeader>
          <CardTitle>Pro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 sm:flex sm:items-end sm:justify-between sm:gap-6 sm:space-y-0">
            <div>
              <div className="text-4xl font-bold text-primary">9,99 €</div>
              <div className="text-sm text-muted-foreground">pro Monat</div>
            </div>
            <div className="text-sm text-muted-foreground">
              Monatlich kündbar. Keine versteckten Kosten.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abonnement-Status - nur für Pro-User anzeigen */}
      {subscription.isPro && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Laufzeit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subscription.nextPaymentDate ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center rounded-lg border bg-muted/30 px-3 py-2">
                    <span className="text-sm text-muted-foreground">
                      {subscription.cancelAtPeriodEnd ? "Läuft bis:" : "Nächste Zahlung:"}
                    </span>
                    <span className="font-medium">
                      {new Date(subscription.nextPaymentDate).toLocaleDateString('de-DE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  {subscription.periodStart && (
                    <div className="flex justify-between items-center rounded-lg border bg-muted/30 px-3 py-2">
                      <span className="text-sm text-muted-foreground">
                        Laufzeit seit:
                      </span>
                      <span className="font-medium">
                        {new Date(subscription.periodStart).toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  {subscription.isSimulated && (
                    <div className="text-xs text-muted-foreground border rounded px-2 py-1">
                      Nur-Entwicklung: simuliertes Abo (kein Stripe-Checkout).
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <span className="text-green-600">✓</span>{" "}
                  {subscription.isSimulated
                    ? "Pro aktiv (lokaler Testeintrag)."
                    : "Pro aktiv. Abrechnungsdaten erscheinen, sobald Stripe synchronisiert ist."}
                </div>
              )}
              
              {subscription.cancelAtPeriodEnd && (
                <Alert>
                  <AlertDescription>
                    <strong>Abonnement gekündigt</strong><br />
                    Dein Pro-Status läuft bis zum {new Date(subscription.nextPaymentDate || '').toLocaleDateString('de-DE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}. 
                    {subscription.daysRemaining !== null && subscription.daysRemaining !== undefined && subscription.daysRemaining > 0 && (
                      <><br /><strong>Noch {subscription.daysRemaining} Tage übrig</strong></>
                    )}
                    <br />Du kannst die Kündigung jederzeit rückgängig machen.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kostenloser User Status */}
      {!subscription.isPro && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Kostenloser Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Im kostenlosen Tarif sind Pro-Funktionen wie unbegrenztes Üben, eigene Decks und Spaced Repetition eingeschränkt.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions: Kündigen immer anbieten, solange Pro aktiv und keine Kündigung zum Periodenende geplant */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        {subscription.isPro ? (
          <div className="flex flex-col gap-3">
            {subscription.cancelAtPeriodEnd ? (
              <Button
                onClick={handleReactivate}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? "Wird reaktiviert..." : "Abonnement wiederherstellen"}
              </Button>
            ) : (
              <>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Wird gekündigt..." : "Abonnement kündigen"}
                </Button>
                <p className="text-sm text-muted-foreground max-w-md">
                  Stoppt nur die automatische Verlängerung. Pro bleibt bis zum Ende der bereits bezahlten Laufzeit aktiv.
                </p>
              </>
            )}
          </div>
        ) : (
          // Nur "Upgraden" anzeigen für kostenlose User
          <Button 
            onClick={handleUpgrade}
            disabled={actionLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {actionLoading ? "Wird verarbeitet..." : "Jetzt auf Pro upgraden"}
          </Button>
        )}
      </div>

      {/* Info */}
      <Alert>
        <AlertDescription>
          <strong>Hinweis:</strong> Alle deine Daten und Statistiken bleiben erhalten, 
          egal ob du zwischen kostenlosem und Pro-Plan wechselst.
        </AlertDescription>
      </Alert>
    </div>
  )
}
