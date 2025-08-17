// middleware.ts
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

// -----------------------------
// Einfache In-Memory Rate-Limitierung (DEV)
// Für Produktion später Upstash/Redis o.ä. nutzen
// -----------------------------
type RLRec = { count: number; resetAt: number }
const WINDOW_MS = 10_000 // 10 Sekunden
const LIMIT = 20         // max. 20 Requests pro Fenster

const RL_STORE_KEY = "__RL_MAP__"
// @ts-ignore – globaler Speicher in Dev
const RL: Map<string, RLRec> = (globalThis[RL_STORE_KEY] ||= new Map<string, RLRec>())

// Welche Pfade begrenzen?
const RL_PATHS: RegExp[] = [
  /^\/api\/auth\//,
  /^\/api\/attempts(\/|$)/,
  /^\/api\/history(\/|$)/,
  /^\/api\/stripe\/webhook$/, // in Dev ok; in Prod evtl. rausnehmen
  /^\/api\/stripe\/checkout$/, // Checkout-POST schützen
]

function shouldRateLimit(pathname: string) {
  return RL_PATHS.some((re) => re.test(pathname))
}

function ipFrom(req: NextRequest): string {
  const xf = req.headers.get("x-forwarded-for") || ""
  return xf.split(",")[0].trim() || "127.0.0.1"
}

function checkRateLimit(key: string) {
  const now = Date.now()
  const rec = RL.get(key)
  if (!rec || rec.resetAt <= now) {
    RL.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, remaining: LIMIT - 1, resetMs: WINDOW_MS }
  } else {
    if (rec.count >= LIMIT) return { ok: false, remaining: 0, resetMs: rec.resetAt - now }
    rec.count++
    return { ok: true, remaining: LIMIT - rec.count, resetMs: rec.resetAt - now }
  }
}

// -----------------------------
// Middleware
// -----------------------------
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1) Statische Ressourcen früh rauslassen (kein Header/RateLimit nötig)
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.(?:png|jpg|jpeg|svg|gif|webp)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // 2) Rate-Limit (nur für definierte API-Routen)
  if (shouldRateLimit(pathname)) {
    const key = `${ipFrom(req)}:${RL_PATHS.find((re) => re.test(pathname))?.source ?? ""}`
    const rl = checkRateLimit(key)
    if (!rl.ok) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rl.resetMs / 1000).toString(),
          "X-RateLimit-Limit": String(LIMIT),
          "X-RateLimit-Remaining": "0",
        },
      })
    }
    // Falls nicht gedrosselt, Response mit RateLimit-Headern anreichern
    const res = NextResponse.next()
    res.headers.set("X-RateLimit-Limit", String(LIMIT))
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining))
    applySecurityHeaders(res)
    return res
  }

  // 3) Normale Antwort + Security-Header
  const res = NextResponse.next()
  applySecurityHeaders(res)
  return res
}

// -----------------------------
// Security-Header
// -----------------------------
function applySecurityHeaders(res: NextResponse) {
  const isProd = process.env.NODE_ENV === "production"

  // ⚠️ Passe Domains an, falls du externe Quellen nutzt (z.B. weitere CDNs)
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self' https://checkout.stripe.com",
    "base-uri 'self'",
  ].join("; ")

  res.headers.set("Content-Security-Policy", csp)
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
  if (isProd) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
  }
}

// -----------------------------
// Matcher: simple & kompatibel
// -----------------------------
export const config = {
  matcher: ["/:path*"], // wir filtern Assets selbst im Code
}
