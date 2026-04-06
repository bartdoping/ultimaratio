// components/subscription-management.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
      const response = await fetch("/api/stripe/subscription/status", {
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
        alert(`Fehler beim Erstellen des Abonnements: ${data.details || data.error || "Unbekannter Fehler"}`)
      }
    } catch (error) {
      console.error("Upgrade failed:", error)
      alert(`Fehler beim Upgrade: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`)
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
        alert(msg)
        fetchSubscriptionStatus()
      } else {
        console.error("Cancel failed:", data)
        const detail =
          typeof data.details === "string" ? data.details : data.error
        alert(
          `Kündigung fehlgeschlagen: ${detail || "Unbekannter Fehler"}`
        )
      }
    } catch (error) {
      console.error("Cancel failed:", error)
      alert(`Fehler beim Kündigen des Abonnements: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`)
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
        alert(
          "Abonnement wurde reaktiviert. Die automatische Verlängerung ist wieder aktiv."
        )
        fetchSubscriptionStatus()
      } else {
        console.error("Reactivation failed:", data)
        alert(`Fehler beim Reaktivieren des Abonnements: ${data.error || "Unbekannter Fehler"}`)
      }
    } catch (error) {
      console.error("Reactivation failed:", error)
      alert(`Fehler beim Reaktivieren des Abonnements: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Lädt...</div>
  }

  if (!subscription) {
    return <div className="text-center py-8 text-red-600">Fehler beim Laden der Abonnement-Daten</div>
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Aktueller Status
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
              ? "Du hast Zugang zu allen Pro-Features"
              : "Du nutzt den kostenlosen Plan. Für Übungen und den vollen Funktionsumfang ist Pro erforderlich."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Subscription Details */}
      {subscription.isPro && subscription.subscriptionDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Abonnement-Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-medium">
                {subscription.subscriptionDetails.cancelAtPeriodEnd ? "Wird gekündigt" : "Aktiv"}
              </span>
            </div>
            {subscription.subscriptionDetails.currentPeriodEnd && (
              <div className="flex justify-between">
                <span>Läuft bis:</span>
                <span className="font-medium">
                  {new Date(subscription.subscriptionDetails.currentPeriodEnd).toLocaleDateString("de-DE")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pro Features */}
      <Card>
        <CardHeader>
          <CardTitle>Pro-Features</CardTitle>
          <CardDescription>
            Alle Vorteile von fragenkreuzen.de Pro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Unbegrenzte Fragen pro Tag</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Zugang zu allen Prüfungsfragen</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Detaillierte Statistiken</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Spaced Repetition System</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Eigene Prüfungsdecks</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>KI-Tutor Unterstützung</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Preise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="text-4xl font-bold text-primary">9,99€</div>
            <div className="text-lg text-muted-foreground">pro Monat</div>
            <div className="text-sm text-muted-foreground">
              Jederzeit kündbar • Keine versteckten Kosten
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abonnement-Status - nur für Pro-User anzeigen */}
      {subscription.isPro && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pro-Abonnement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subscription.nextPaymentDate ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
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
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Laufperiode von:
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
                    <strong>⚠️ Abonnement gekündigt</strong><br />
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>⚪</span>
              Kostenloser Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Im kostenlosen Tarif stehen dir die Pro-Funktionen (unbegrenztes Üben, eigene Decks,
                Spaced Repetition usw.) nicht zur Verfügung.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions: Kündigen immer anbieten, solange Pro aktiv und keine Kündigung zum Periodenende geplant */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
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
                  Kündigung = Ende der automatischen Verlängerung. Pro bleibt bis zum Ende der
                  laufenden, bereits bezahlten Periode aktiv (Stripe:{" "}
                  <code className="text-xs">cancel_at_period_end</code>
                  ). Danach wechselst du automatisch in den kostenlosen Tarif.
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
            {actionLoading ? "Wird verarbeitet..." : "Jetzt upgraden - 9,99€/Monat"}
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
