/**
 * In-Memory Rate-Limit für den Generator.
 *
 * Verhindert Burst-Aufrufe von ein und demselben Subjekt (User, anon visitor
 * cookie, IP). Die Bewertung erfolgt rein im Prozess-Speicher — in einem
 * Multi-Instance- oder Serverless-Setup (Vercel, Edge) ist der Schutz
 * best-effort und überlebt keinen Cold-Start. Für richtigen Schutz wäre
 * Redis/Upstash nötig; diese Datei lässt sich später transparent durch
 * eine Redis-Implementierung ersetzen.
 *
 * Bewusst klein gehalten, keine externen Dependencies.
 */

/** Mindestabstand zwischen zwei erfolgreichen Aufrufen je Subjekt. */
export const GENERATOR_MIN_INTERVAL_MS = 10_000

type Entry = { lastAt: number }

const store = new Map<string, Entry>()

/** Größe der Map clampen, damit auch bei Missbrauch kein RAM-Leak entsteht. */
const MAX_ENTRIES = 5_000

function gc(now: number) {
  if (store.size <= MAX_ENTRIES) return
  for (const [key, entry] of store) {
    if (now - entry.lastAt > GENERATOR_MIN_INTERVAL_MS * 6) {
      store.delete(key)
    }
    if (store.size <= MAX_ENTRIES * 0.8) break
  }
}

export type RateLimitDecision =
  | { ok: true }
  | { ok: false; retryAfterMs: number }

/**
 * Versucht, eine Generierung für `key` zu reservieren. Wenn der letzte Aufruf
 * < `GENERATOR_MIN_INTERVAL_MS` her ist, wird `ok: false` mit verbleibender
 * Restzeit zurückgegeben — der Aufrufer soll dann KEIN Quota verbrauchen
 * und dem Client 429 antworten.
 */
export function tryAcquireGeneratorSlot(key: string, now: number = Date.now()): RateLimitDecision {
  if (!key) return { ok: true } // Kein Identifier — nicht limitieren.
  const entry = store.get(key)
  if (entry) {
    const elapsed = now - entry.lastAt
    if (elapsed < GENERATOR_MIN_INTERVAL_MS) {
      return { ok: false, retryAfterMs: GENERATOR_MIN_INTERVAL_MS - elapsed }
    }
  }
  store.set(key, { lastAt: now })
  gc(now)
  return { ok: true }
}

/** Test-/Reset-Hook (nur für Unit-Tests). */
export function __resetGeneratorRateLimit(): void {
  store.clear()
}

/** Stabilen Rate-Limit-Schlüssel aus dem Quota-Subjekt bauen. */
export function rateLimitKeyFor(params: {
  userId?: string | null
  anonKey?: string | null
  ipHash?: string | null
}): string {
  if (params.userId) return `u:${params.userId}`
  if (params.anonKey) return `a:${params.anonKey}`
  if (params.ipHash) return `i:${params.ipHash}`
  return ""
}
