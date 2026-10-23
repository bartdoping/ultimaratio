/**
 * Kennzahlen aus Produktereignissen und KI-Verbrauch.
 *
 * Reine Rechenfunktionen ohne Datenbankzugriff — die Admin-Seite lädt die
 * Rohzeilen, hier wird gerechnet. So bleibt jede Zahl mit festen Beispielen
 * prüfbar.
 */

import { costUsd, type ModelPrice } from "@/lib/ai-usage"

export const MS_TAG = 86_400_000

/** UTC-Tag als "YYYY-MM-DD". */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Retention
// ---------------------------------------------------------------------------

/**
 * Klassische Tag-N-Retention: Anteil der Nutzer einer Kohorte, die genau am
 * N-ten Tag nach ihrer Registrierung wieder aktiv waren. Gezählt werden nur
 * Kohorten, deren Tag N bereits vorbei ist — sonst würden junge Kohorten die
 * Quote künstlich drücken.
 */
export function retention(
  signups: { userId: string; at: Date }[],
  activity: { userId: string; at: Date }[],
  tage: number[],
  jetzt: Date = new Date()
): Record<number, { quote: number | null; basis: number }> {
  const aktiveTage = new Map<string, Set<string>>()
  for (const a of activity) {
    const set = aktiveTage.get(a.userId) ?? new Set<string>()
    set.add(dayKey(a.at))
    aktiveTage.set(a.userId, set)
  }

  const out: Record<number, { quote: number | null; basis: number }> = {}
  for (const n of tage) {
    let basis = 0
    let zurueck = 0
    for (const s of signups) {
      const ziel = new Date(Date.UTC(s.at.getUTCFullYear(), s.at.getUTCMonth(), s.at.getUTCDate()) + n * MS_TAG)
      // Tag N muss vollständig vorbei sein.
      if (ziel.getTime() + MS_TAG > jetzt.getTime()) continue
      basis++
      if (aktiveTage.get(s.userId)?.has(dayKey(ziel))) zurueck++
    }
    out[n] = { quote: basis > 0 ? zurueck / basis : null, basis }
  }
  return out
}

// ---------------------------------------------------------------------------
// Kosten
// ---------------------------------------------------------------------------

export type UsageRow = {
  createdAt: Date
  purpose: string
  model: string
  inputTokens: number
  cachedTokens: number
  outputTokens: number
  userId: string | null
}

export type CostSummary = {
  /** Summe in USD über alle Aufrufe MIT bekanntem Preis. */
  usd: number
  /** Aufrufe ohne hinterlegten Preis — deren Kosten fehlen in `usd`. */
  callsOhnePreis: number
  modelleOhnePreis: string[]
  calls: number
  outputTokens: number
  nachZweck: Record<string, { calls: number; usd: number; outputTokens: number }>
}

export function summarizeCost(rows: UsageRow[], prices?: Record<string, ModelPrice>): CostSummary {
  const out: CostSummary = {
    usd: 0,
    callsOhnePreis: 0,
    modelleOhnePreis: [],
    calls: rows.length,
    outputTokens: 0,
    nachZweck: {},
  }
  const ohne = new Set<string>()
  for (const r of rows) {
    const c = costUsd(r.model, r, prices)
    out.outputTokens += r.outputTokens
    const z = (out.nachZweck[r.purpose] ??= { calls: 0, usd: 0, outputTokens: 0 })
    z.calls++
    z.outputTokens += r.outputTokens
    if (c === null) {
      out.callsOhnePreis++
      ohne.add(r.model)
    } else {
      out.usd += c
      z.usd += c
    }
  }
  out.modelleOhnePreis = [...ohne]
  return out
}

/**
 * Kosten pro ausgelieferter Frage: alle KI-Kosten geteilt durch die Zahl der
 * Fragen, die Nutzer tatsächlich gesehen haben (neu erzeugt ODER aus dem Pool).
 * Genau diese Zahl sinkt, je mehr der Pool trägt.
 */
export function costPerQuestion(totalUsd: number, questionsServed: number): number | null {
  if (questionsServed <= 0) return null
  return totalUsd / questionsServed
}

// ---------------------------------------------------------------------------
// Aktivität je Tag
// ---------------------------------------------------------------------------

export function perDay<T extends { createdAt: Date }>(
  rows: T[],
  tage: number,
  jetzt: Date = new Date(),
  wert: (r: T) => number = () => 1
): { tag: string; wert: number }[] {
  const map = new Map<string, number>()
  for (let i = tage - 1; i >= 0; i--) map.set(dayKey(new Date(jetzt.getTime() - i * MS_TAG)), 0)
  for (const r of rows) {
    const k = dayKey(r.createdAt)
    if (map.has(k)) map.set(k, (map.get(k) ?? 0) + wert(r))
  }
  return [...map.entries()].map(([tag, w]) => ({ tag, wert: w }))
}

/** Verschiedene aktive Nutzer je Tag. */
export function activeUsersPerDay(
  rows: { createdAt: Date; userId: string | null }[],
  tage: number,
  jetzt: Date = new Date()
): { tag: string; wert: number }[] {
  const map = new Map<string, Set<string>>()
  for (let i = tage - 1; i >= 0; i--) map.set(dayKey(new Date(jetzt.getTime() - i * MS_TAG)), new Set())
  for (const r of rows) {
    if (!r.userId) continue
    map.get(dayKey(r.createdAt))?.add(r.userId)
  }
  return [...map.entries()].map(([tag, s]) => ({ tag, wert: s.size }))
}
