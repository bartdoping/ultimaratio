"use client"

import { BellRing, Flame, TrendingDown, TrendingUp, Trophy, X } from "lucide-react"
import type { StufenVorschlag } from "@/lib/kreuzen-flow"

export type ThemenStand = { topic: string; sicher: number; gesamt: number }

const STUFEN_NAME = ["", "Basis", "Solide", "Examen", "Schwer", "Fies"]

/** Kurzer Abschluss nach jeder Runde — Etappe statt endloser Strom. */
export function RundenKarte({
  runde,
  bilanz,
  themenStand,
  stufe,
  onWeiter,
  onSchwerer,
  onHome,
}: {
  runde: number
  bilanz: { richtig: number; gesamt: number; besteSerie: number }
  themenStand: ThemenStand | null
  stufe: number
  onWeiter: () => void
  onSchwerer: (() => void) | null
  onHome: () => void
}) {
  const quote = bilanz.gesamt ? bilanz.richtig / bilanz.gesamt : 0
  const urteil = quote >= 0.9 ? "Überragend." : quote >= 0.7 ? "Stark." : quote >= 0.5 ? "Solide Runde." : "Genau hier lernst du am meisten."
  return (
    <div className="space-y-4 rounded-3xl border bg-card p-6 text-center animate-fade-in" role="status">
      <Trophy className="mx-auto h-8 w-8 text-primary" aria-hidden />
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Runde {runde} geschafft</div>
        <div className="mt-1 text-4xl font-bold tabular-nums">
          {bilanz.richtig}
          <span className="text-xl text-muted-foreground"> / {bilanz.gesamt}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {urteil}
          {bilanz.besteSerie >= 3 && ` Beste Serie: ${bilanz.besteSerie} in Folge.`}
        </p>
      </div>

      {themenStand && themenStand.gesamt > 0 && (
        <div className="rounded-2xl bg-muted/50 p-3 text-left">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium">{themenStand.topic}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {themenStand.sicher} von {themenStand.gesamt} sicher
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round((themenStand.sicher / themenStand.gesamt) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onWeiter}
          autoFocus
          className="h-12 rounded-full bg-primary text-base font-semibold text-primary-foreground"
        >
          Nächste Runde →
        </button>
        {onSchwerer && (
          <button type="button" onClick={onSchwerer} className="h-11 rounded-full border text-sm font-medium hover:bg-muted">
            Nächste Runde auf „{STUFEN_NAME[stufe + 1]}“
          </button>
        )}
        <button type="button" onClick={onHome} className="h-10 text-sm text-muted-foreground hover:text-foreground">
          Für heute genug
        </button>
      </div>
    </div>
  )
}

/** Serie feiern bzw. Stufe anbieten — erscheint nach der Auflösung über der Frage. */
export function FlowHinweis({
  serie,
  vorschlag,
  onAnnehmen,
  onAblehnen,
}: {
  serie: number | null
  vorschlag: StufenVorschlag
  onAnnehmen: () => void
  onAblehnen: () => void
}) {
  if (vorschlag) {
    const schwerer = vorschlag.richtung === "schwerer"
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm animate-fade-in" role="status">
        {schwerer ? <TrendingUp className="h-5 w-5 shrink-0 text-primary" aria-hidden /> : <TrendingDown className="h-5 w-5 shrink-0 text-primary" aria-hidden />}
        <span className="min-w-0 flex-1">
          {schwerer ? "Läuft! Bereit für mehr Fallstricke?" : "Zäh gerade — kurz eine Stufe leichter festigen?"}
        </span>
        <button type="button" onClick={onAnnehmen} className="h-9 shrink-0 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground">
          {STUFEN_NAME[vorschlag.stufe]}
        </button>
        <button type="button" onClick={onAblehnen} aria-label="Nein danke" className="tap-target shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    )
  }
  if (serie) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-700 animate-fade-in dark:text-orange-300" role="status">
        <Flame className="h-4 w-4" aria-hidden /> {serie} richtig in Folge
      </div>
    )
  }
  return null
}

/** Erinnerung genau dann anbieten, wenn das Tagesziel geschafft ist. */
export function ErinnerungsAngebot({
  laedt,
  onJa,
  onNein,
}: {
  laedt: boolean
  onJa: () => void
  onNein: () => void
}) {
  return (
    <div className="mb-3 rounded-2xl border bg-card p-4 text-sm animate-fade-in" role="status">
      <div className="flex items-center gap-2 font-semibold">
        <BellRing className="h-4 w-4 text-primary" aria-hidden /> Tagesziel geschafft!
      </div>
      <p className="mt-1 text-muted-foreground">
        Soll ich dich abends kurz per Mail erinnern, falls du an einem Tag noch nicht gekreuzt hast? Höchstens einmal am Tag,
        jederzeit abbestellbar.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onJa}
          disabled={laedt}
          className="h-10 flex-1 rounded-full bg-primary font-semibold text-primary-foreground disabled:opacity-60"
        >
          {laedt ? "…" : "Ja, erinnern"}
        </button>
        <button type="button" onClick={onNein} className="h-10 rounded-full px-4 text-muted-foreground hover:bg-muted">
          Nein danke
        </button>
      </div>
    </div>
  )
}
