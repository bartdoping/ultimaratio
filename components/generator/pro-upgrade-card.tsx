"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Sparkles } from "lucide-react"
import { ProDetailsModal } from "@/components/generator/pro-details-modal"
import { TrialStartButton } from "@/components/subscription/trial-start-button"

type Variant = "generator" | "account"

type Props = {
  variant?: Variant
  onUpgrade?: () => void
  upgrading?: boolean
  isLoggedIn?: boolean
  isPro?: boolean
  /** Wenn true: Trial wurde noch nicht genutzt → Trial-CTA anbieten. */
  trialEligible?: boolean
}

const BENEFITS = [
  {
    title: "100 Generierungen pro Tag",
    text: "Statt 3 in der Free-Version. Mehr Themen, mehr Wiederholung, schnellere Lernschleifen.",
  },
  {
    title: "Lange Fallvignetten ohne Gedanken ans Limit",
    text: "Fallfragen mit bis zu 5 Teilfragen sind im Pro-Tarif Alltag, nicht Ausnahme.",
  },
  {
    title: "Schwere Stufen sinnvoll nutzbar",
    text: "Schwierigkeit 4 und 5 entfalten ihren Wert nur, wenn du sie regelmäßig kreuzen kannst.",
  },
  {
    title: "Tiefere Erklärungen lesen, statt sparen zu müssen",
    text: "Jede Antwortoption mit eigener Begründung. Must-Know und ggf. Lernhilfe pro Frage.",
  },
] as const

export function ProUpgradeCard({
  variant = "generator",
  onUpgrade,
  upgrading = false,
  isLoggedIn = true,
  isPro = false,
  trialEligible = false,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <>
      <section
        aria-labelledby="pro-upgrade-title"
        className="overflow-hidden rounded-2xl border bg-card shadow-sm"
      >
        <div className="border-b bg-gradient-to-br from-primary/5 via-background to-background px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Pro</span>
              </div>
              <h2 id="pro-upgrade-title" className="mt-1 text-xl font-semibold tracking-tight">
                {variant === "generator"
                  ? "Mehr generieren, tiefer lernen"
                  : "Pro für ernsthafte Vorbereitung"}
              </h2>
              <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                Pro entfernt das tägliche Limit für die Generierung und macht anspruchsvolle Fallfragen
                alltagstauglich.
              </p>
            </div>
            <div className="hidden sm:block text-right shrink-0">
              <div className="text-2xl font-semibold tabular-nums">9,99&nbsp;€</div>
              <div className="text-xs text-muted-foreground">pro Monat · monatlich kündbar</div>
            </div>
          </div>
        </div>

        <ul className="grid gap-3 px-6 py-5 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <Check className="h-3.5 w-3.5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-medium leading-snug">{b.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{b.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            Kein Tracking ungewünschter Daten · Kündigung jederzeit zum Periodenende · Admin-Pro für interne Tests.
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {variant === "generator" ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailsOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={detailsOpen}
                >
                  Details
                </Button>
                {isLoggedIn && trialEligible && !isPro && (
                  <TrialStartButton size="sm" variant="outline" />
                )}
                {onUpgrade && (
                  <Button onClick={onUpgrade} disabled={upgrading} size="sm">
                    {upgrading
                      ? "Weiterleitung…"
                      : isLoggedIn
                        ? "Auf Pro upgraden"
                        : "Pro freischalten"}
                  </Button>
                )}
              </>
            ) : isLoggedIn ? (
              <>
                {trialEligible && !isPro && (
                  <TrialStartButton size="sm" variant="outline" />
                )}
                <Button asChild size="sm">
                  <Link href="/subscription">Abo verwalten</Link>
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDetailsOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={detailsOpen}
              >
                Details
              </Button>
            )}
          </div>
        </div>
      </section>

      <ProDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        isLoggedIn={isLoggedIn}
        isPro={isPro}
        onUpgrade={onUpgrade}
        upgrading={upgrading}
      />
    </>
  )
}
