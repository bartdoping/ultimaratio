import { AsyncLocalStorage } from "async_hooks"
import prisma from "@/lib/db"

/**
 * Erfassung des KI-Verbrauchs.
 *
 * Jeder Modellaufruf schreibt Tokens, Dauer, Zweck und — sofern bekannt — den
 * Nutzer. Daraus entstehen "Kosten pro Frage", "Kosten pro Nutzer und Tag"
 * und die Grundlage für jede Kontingent- und Preisentscheidung.
 *
 * Gespeichert werden Tokens, nicht Euro: Preise ändern sich, und für neue
 * Modelle sind sie nicht immer bekannt. Umgerechnet wird erst in der
 * Auswertung (`costUsd`). Ein unbekannter Preis wird als unbekannt gezeigt,
 * nicht geraten.
 *
 * Schreiben ist "fire and forget": Die Messung darf eine Generierung weder
 * verlangsamen noch scheitern lassen.
 */

export type AiPurpose =
  | "draft"
  | "enrich"
  | "repair"
  | "review"
  | "exclusion"
  | "deepdive"
  | "assistant"
  | "other"

type Ctx = { userId?: string | null }
const storage = new AsyncLocalStorage<Ctx>()

/** Führt `fn` mit Nutzerbezug aus; alle darin gemachten KI-Aufrufe werden ihm zugeordnet. */
export function withAiUser<T>(userId: string | null | undefined, fn: () => Promise<T>): Promise<T> {
  return storage.run({ userId: userId ?? null }, fn)
}

type UsageLike = {
  input_tokens?: number
  output_tokens?: number
  input_tokens_details?: { cached_tokens?: number } | null
  output_tokens_details?: { reasoning_tokens?: number } | null
} | null | undefined

export function recordAiUsage(entry: {
  purpose: AiPurpose
  model: string
  usage: UsageLike
  durationMs: number
  ok: boolean
}): void {
  const u = entry.usage
  const userId = storage.getStore()?.userId ?? null
  void prisma.aiUsageEvent
    .create({
      data: {
        purpose: entry.purpose,
        model: entry.model,
        inputTokens: u?.input_tokens ?? 0,
        cachedTokens: u?.input_tokens_details?.cached_tokens ?? 0,
        outputTokens: u?.output_tokens ?? 0,
        reasoningTokens: u?.output_tokens_details?.reasoning_tokens ?? 0,
        durationMs: Math.max(0, Math.round(entry.durationMs)),
        ok: entry.ok,
        userId,
      },
    })
    .catch(() => {
      // Messung ist nie wichtiger als die Funktion.
    })
}

// ---------------------------------------------------------------------------
// Preise
// ---------------------------------------------------------------------------

/** USD je 1 Mio. Tokens. */
export type ModelPrice = { input: number; cached: number; output: number }

/**
 * Bekannte Listenpreise (USD / 1 Mio. Tokens, OpenAI-Preisliste). Für Modelle,
 * die hier fehlen — etwa gpt-5.6-terra —, wird der Preis über die
 * Umgebungsvariable AI_PRICES_JSON gesetzt, z. B.
 *   AI_PRICES_JSON='{"gpt-5.6-terra":{"input":1.25,"cached":0.125,"output":10}}'
 * Ohne Eintrag zeigt die Auswertung "Preis unbekannt" statt einer erfundenen Zahl.
 */
const DEFAULT_PRICES: Record<string, ModelPrice> = {
  "gpt-4o-mini": { input: 0.15, cached: 0.075, output: 0.6 },
  "gpt-4o": { input: 2.5, cached: 1.25, output: 10 },
  "gpt-5": { input: 1.25, cached: 0.125, output: 10 },
  "gpt-5-mini": { input: 0.25, cached: 0.025, output: 2 },
}

export function modelPrices(): Record<string, ModelPrice> {
  let extra: Record<string, ModelPrice> = {}
  try {
    const raw = process.env.AI_PRICES_JSON?.trim()
    if (raw) extra = JSON.parse(raw) as Record<string, ModelPrice>
  } catch {
    console.warn("[ai-usage] AI_PRICES_JSON ist kein gültiges JSON — ignoriert.")
  }
  return { ...DEFAULT_PRICES, ...extra }
}

/** Kosten in USD — oder null, wenn für das Modell kein Preis hinterlegt ist. */
export function costUsd(
  model: string,
  t: { inputTokens: number; cachedTokens: number; outputTokens: number },
  prices = modelPrices()
): number | null {
  const p = prices[model]
  if (!p) return null
  const uncached = Math.max(0, t.inputTokens - t.cachedTokens)
  return (uncached * p.input + t.cachedTokens * p.cached + t.outputTokens * p.output) / 1_000_000
}
