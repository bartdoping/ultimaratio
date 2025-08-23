// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// -----------------------------
// Einfache In-Memory Rate-Limitierung (DEV)
// In PROD später Upstash/Redis o.ä. nutzen
// -----------------------------
type RLRec = { count: number; resetAt: number };
const WINDOW_MS = 10_000; // 10 Sekunden
const LIMIT = 20;         // max. 20 Requests pro Fenster

const RL_STORE_KEY = "__RL_MAP__";
// @ts-ignore – globaler Speicher in Dev (HMR-sicher)
const RL: Map<string, RLRec> = (globalThis[RL_STORE_KEY] ||= new Map<string, RLRec>());

// Welche Pfade drosseln?
const RL_PATHS: RegExp[] = [
  /^\/api\/auth\//,
  /^\/api\/attempts(\/|$)/,
  /^\/api\/history(\/|$)/,
  /^\/api\/stripe\/checkout$/, // Checkout-POST schützen
  // ⚠️ bewusst NICHT: /api/stripe/webhook (siehe Allowlist unten)
];

function shouldRateLimit(pathname: string) {
  return RL_PATHS.some((re) => re.test(pathname));
}

function ipFrom(req: NextRequest): string {
  const xf = req.headers.get("x-forwarded-for") || "";
  return xf.split(",")[0].trim() || "127.0.0.1";
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const rec = RL.get(key);
  if (!rec || rec.resetAt <= now) {
    RL.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: LIMIT - 1, resetMs: WINDOW_MS };
  } else {
    if (rec.count >= LIMIT) return { ok: false, remaining: 0, resetMs: rec.resetAt - now };
    rec.count++;
    return { ok: true, remaining: LIMIT - rec.count, resetMs: rec.resetAt - now };
  }
}

// -----------------------------
// Middleware
// -----------------------------
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 0) Harte Allowlist – nichts anfassen:
  //    Webhook MUSS unverändert durch (keine Header, kein RL, kein Redirect)
  if (
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|txt|css|js|map)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 1) Rate-Limit (nur für definierte API-Routen)
  if (shouldRateLimit(pathname)) {
    const bucket = RL_PATHS.find((re) => re.test(pathname))?.source ?? "";
    const key = `${ipFrom(req)}:${bucket}`;
    const rl = checkRateLimit(key);
    if (!rl.ok) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rl.resetMs / 1000).toString(),
          "X-RateLimit-Limit": String(LIMIT),
          "X-RateLimit-Remaining": "0",
        },
      });
    }
    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Limit", String(LIMIT));
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    applySecurityHeaders(res);
    return res;
  }

  // 2) Normale Antwort + Security-Header
  const res = NextResponse.next();
  applySecurityHeaders(res);
  return res;
}

// -----------------------------
// Security-Header
// -----------------------------
function applySecurityHeaders(res: NextResponse) {
  const isProd = process.env.NODE_ENV === "production";

  // CSP so wählen, dass Stripe-Flows funktionieren
  // (Weiterleitungen/Checkout, optional Stripe.js)
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    // Falls du Stripe.js einsetzt, erlaube dessen Domain:
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
    // Für XHR/WebSocket etc. (Client) – Stripe API erlauben:
    "connect-src 'self' https://api.stripe.com",
    // Für gehosteten Checkout & mögliche Frames/Redirects:
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com",
    "frame-ancestors 'none'",
    "form-action 'self' https://checkout.stripe.com",
    "base-uri 'self'",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  if (isProd) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}

// -----------------------------
// Matcher: simpel & kompatibel
// -----------------------------
export const config = {
  matcher: ["/:path*"], // wir filtern Assets & Allowlist im Code
};