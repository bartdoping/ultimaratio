"use client"

import Link from "next/link"
import { Check, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { GENERATOR_FREE_DAILY_LIMIT, GENERATOR_PRO_DAILY_LIMIT } from "@/lib/generator-plan-config"

type Props = {
  open: boolean
  onOpenChange: (next: boolean) => void
  isLoggedIn: boolean
  isPro?: boolean
  onUpgrade?: () => void
  upgrading?: boolean
}

const BENEFITS = [
  {
    title: `Bis zu ${GENERATOR_PRO_DAILY_LIMIT} KI-Generierungen pro Tag`,
    text: `Statt ${GENERATOR_FREE_DAILY_LIMIT} im Free-Tarif – genug Raum für ganze Themenblöcke.`,
  },
  {
    title: "Lange Fallvignetten ohne Limit-Druck",
    text: "Fallfragen mit 2–5 Teilfragen werden zum Alltag, nicht zur Ausnahme.",
  },
  {
    title: "Hohe Schwierigkeitsstufen wirklich nutzbar",
    text: "Schwierigkeit 4 & 5 sind nur sinnvoll, wenn sie regelmäßig gekreuzt werden können.",
  },
  {
    title: "Tiefere Erklärungen lesen, statt sparen",
    text: "Pro Frage: Begründung je Antwortoption, Lernziel und Prüfungsfalle.",
  },
] as const

const COMPARISON: Array<{ label: string; free: string; pro: string; highlight?: boolean }> = [
  {
    label: "Generierungen pro Tag",
    free: String(GENERATOR_FREE_DAILY_LIMIT),
    pro: String(GENERATOR_PRO_DAILY_LIMIT),
    highlight: true,
  },
  { label: "Fallvignetten mit 2–5 Teilfragen", free: "Im Limit enthalten", pro: "Ohne Limit-Druck" },
  { label: "Schwierigkeit 1–5", free: "Verfügbar", pro: "Verfügbar" },
  { label: "Erklärungen pro Antwort", free: "Verfügbar", pro: "Verfügbar" },
  { label: "Lernziel & Prüfungsfalle", free: "Verfügbar", pro: "Verfügbar" },
]

export function ProDetailsModal({
  open,
  onOpenChange,
  isLoggedIn,
  isPro = false,
  onUpgrade,
  upgrading = false,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader className="space-y-2 border-b bg-gradient-to-br from-primary/5 via-background to-background px-6 py-5 text-left">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Pro im Detail</span>
          </div>
          <DialogTitle className="text-xl tracking-tight">
            {isPro ? "Du nutzt bereits Pro" : "Mehr generieren, tiefer lernen"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isPro
              ? "Vielen Dank für deine Unterstützung. Du hast vollen Zugriff auf alle Generator-Funktionen."
              : "Pro entfernt das tägliche Limit für den Generator und macht anspruchsvolle Fallvignetten alltagstauglich."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-5 space-y-6">
          <ul className="grid gap-3 sm:grid-cols-2">
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

          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium text-muted-foreground">&nbsp;</th>
                  <th className="px-4 py-2 font-medium">Free</th>
                  <th className="px-4 py-2 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      Pro
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        9,99&nbsp;€/Mo
                      </span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {COMPARISON.map((row) => (
                  <tr key={row.label} className={row.highlight ? "bg-primary/5" : undefined}>
                    <td className="px-4 py-2 font-medium">{row.label}</td>
                    <td className="px-4 py-2 text-muted-foreground tabular-nums">{row.free}</td>
                    <td className="px-4 py-2 font-medium tabular-nums">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            Monatlich kündbar · Kündigung wirkt zum Periodenende · Keine versteckten Add-ons.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          {isPro ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Schließen
              </Button>
              <Button asChild size="sm">
                <Link href="/subscription" onClick={() => onOpenChange(false)}>
                  Abo verwalten
                </Link>
              </Button>
            </>
          ) : isLoggedIn ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Später
              </Button>
              {onUpgrade ? (
                <Button
                  size="sm"
                  onClick={() => {
                    onOpenChange(false)
                    onUpgrade()
                  }}
                  disabled={upgrading}
                >
                  {upgrading ? "Weiterleitung…" : "Pro freischalten"}
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link href="/subscription" onClick={() => onOpenChange(false)}>
                    Zur Abo-Seite
                  </Link>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link
                  href="/login?callbackUrl=/generator"
                  onClick={() => onOpenChange(false)}
                >
                  Einloggen
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link
                  href="/register?callbackUrl=/generator"
                  onClick={() => onOpenChange(false)}
                >
                  Kostenlos registrieren
                </Link>
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
