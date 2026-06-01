"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ProUpgradeCard } from "@/components/generator/pro-upgrade-card"
import { CustomerPortalButton } from "@/components/account/customer-portal-button"

type Quota = {
  used: number
  remaining: number
  dailyLimit: number
  unlimited: boolean
}

type Status = {
  quota: Quota
  isPro: boolean
  isLoggedIn: boolean
  trialEligible: boolean
  trialEndsAt: string | null
}

export function GeneratorAccountSummary() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/ai/generate-questions/quota", { credentials: "include" })
        const data = await res.json().catch(() => null)
        if (!cancelled && data?.ok) {
          setStatus({
            quota: data.quota,
            isPro: !!data.isPro,
            isLoggedIn: !!data.isLoggedIn,
            trialEligible: !!data.trialEligible,
            trialEndsAt: data.trialEndsAt ?? null,
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Lade Generator-Status…</p>
      </section>
    )
  }

  if (!status) return null

  const { quota, isPro, trialEligible, trialEndsAt } = status
  const pct = quota.unlimited
    ? 0
    : quota.dailyLimit > 0
      ? Math.min(100, Math.round((quota.used / quota.dailyLimit) * 100))
      : 0

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Generator heute</h2>
              <Badge variant={isPro ? "default" : "outline"}>{isPro ? "Pro" : "Free"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {quota.unlimited
                ? "Unbegrenzte Generierungen."
                : `${quota.remaining} von ${quota.dailyLimit} verbleibend.`}
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/generator">Zum Generator</Link>
          </Button>
        </div>
        {!quota.unlimited && (
          <div className="mt-4 space-y-1.5">
            <Progress value={pct} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {quota.used} verbraucht · Reset um Mitternacht (MEZ)
            </p>
          </div>
        )}
      </section>

      {!isPro && (
        <ProUpgradeCard variant="account" trialEligible={trialEligible} isPro={isPro} />
      )}

      {/* Pro: Rechnungen & Karte direkt im Account erreichbar */}
      {isPro && (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Abo & Zahlungen</h2>
              <p className="text-sm text-muted-foreground">
                {trialEndsAt
                  ? `Pro-Testphase aktiv bis ${new Date(trialEndsAt).toLocaleDateString("de-DE")}.`
                  : "Rechnungen, Zahlungsmethode und Kündigung verwalten."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CustomerPortalButton />
              <Button asChild size="sm" variant="ghost">
                <Link href="/subscription">Abo-Details</Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
