/**
 * In-Memory Rate-Limit für Auth-Endpoints.
 * Best-effort in Serverless/Multi-Instance — bei harten Garantien Redis nutzen.
 *
 * Bewusst eigene Implementierung (statt generator-rate-limit zu reusen),
 * damit Auth eigene Buckets/Fenster bekommen kann.
 */

type Bucket = {
  windowMs: number
  max: number
}

export const AUTH_BUCKETS = {
  // E-Mail-Existenzprüfung: wenig restriktiv, aber gegen Bot-Enumeration.
  checkEmail: { windowMs: 60_000, max: 10 },
  // Registrierung: hart gedrosselt.
  register: { windowMs: 60 * 60_000, max: 5 },
  // Code erneut senden: 1 alle 30 s, max 5 pro Stunde.
  codeResend: { windowMs: 60 * 60_000, max: 5 },
  // Code prüfen: gegen Brute-Force.
  codeVerify: { windowMs: 15 * 60_000, max: 10 },
  // Passwort-Reset anfordern.
  resetRequest: { windowMs: 60 * 60_000, max: 5 },
} as const

type BucketId = keyof typeof AUTH_BUCKETS

const stores = new Map<BucketId, Map<string, number[]>>()

function getStore(bucket: BucketId): Map<string, number[]> {
  let store = stores.get(bucket)
  if (!store) {
    store = new Map()
    stores.set(bucket, store)
  }
  return store
}

export type AuthRateDecision =
  | { ok: true }
  | { ok: false; retryAfterMs: number }

export function tryAcquireAuth(
  bucket: BucketId,
  key: string,
  now: number = Date.now()
): AuthRateDecision {
  if (!key) return { ok: true }
  const { windowMs, max }: Bucket = AUTH_BUCKETS[bucket]
  const store = getStore(bucket)
  const list = store.get(key) ?? []
  // alte Treffer raus
  const cutoff = now - windowMs
  const fresh = list.filter((t) => t > cutoff)
  if (fresh.length >= max) {
    const oldest = fresh[0]
    return { ok: false, retryAfterMs: Math.max(0, windowMs - (now - oldest)) }
  }
  fresh.push(now)
  store.set(key, fresh)
  return { ok: true }
}

/**
 * Client-Schlüssel aus Request: bevorzugt X-Forwarded-For-IP, sonst "unknown".
 * Optional `extra` für E-Mail-spezifische Buckets.
 */
export function rateLimitKey(req: Request, extra?: string): string {
  const xff = req.headers.get("x-forwarded-for")
  const ip =
    (xff && xff.split(",")[0]?.trim()) ||
    req.headers.get("x-real-ip") ||
    "unknown"
  return extra ? `${ip}|${extra}` : ip
}

export function __resetAuthRateLimit(): void {
  stores.clear()
}
