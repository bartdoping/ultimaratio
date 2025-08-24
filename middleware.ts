// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/* ========= Rate-Limit (nur POST/DELETE) ========= */

type RLRec = { count: number; resetAt: number };
const WINDOW_MS = 10_000; // 10s
const LIMIT = 20;         // max. 20 Requests/Fenster

// HMR-sicherer globaler Store via String-Key (vermeidet "unique symbol"-Fehler)
const RL_STORE_KEY = "__RL_MAP__" as const;
const g = globalThis as any;
if (!g[RL_STORE_KEY]) g[RL_STORE_KEY] = new Map<string, RLRec>();
const RL: Map<string, RLRec> = g[RL_STORE_KEY];

const RL_PATHS = [
  /^\/api\/auth\//,
  /^\/api\/attempts(\/|$)/,
  /^\/api\/history(\/|$)/,
  /^\/api\/stripe\/checkout$/, // Checkout-POST schützen
] as const;
const RL_METHODS = new Set(["POST", "DELETE"]);

function shouldRateLimit(req: NextRequest) {
  return RL_METHODS.has(req.method) && RL_PATHS.some((re) => re.test(req.nextUrl.pathname));
}

function ipFrom(req: NextRequest) {
  const xf = req.headers.get("x-forwarded-for") || "";
  return xf.split(",")[0].trim() || "127.0.0.1";
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const rec = RL.get(key);
  if (!rec || rec.resetAt <= now) {
    RL.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: LIMIT - 1, resetMs: WINDOW_MS };
  }
  if (rec.count >= LIMIT) return { ok: false, remaining: 0, resetMs: rec.resetAt - now };
  rec.count++;
  return { ok: true, remaining: LIMIT - rec.count, resetMs: rec.resetAt - now };
}

/* ========= Allowlist ========= */

function isAllowlisted(req: NextRequest) {
  const p = req.nextUrl.pathname;
  // Webhook muss komplett unangetastet durch
  if (p.startsWith("/api/stripe/webhook")) return true;

  // Statische/technische Assets
  if (
    p.startsWith("/_next/") ||
    p === "/favicon.ico" ||
    p === "/robots.txt" ||
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|txt|css|js|map|woff2?)$/.test(p)
  ) return true;

  return false;
}

/* ========= Security-Header / CSP ========= */

function buildCsp(isProd: boolean) {
  const devConnect = isProd ? [] : ["ws:", "http://localhost:*"];
  return [
    "default-src 'self'",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    `connect-src 'self' https://api.stripe.com https://checkout.stripe.com ${devConnect.join(" ")}`.trim(),
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com",
    "frame-ancestors 'none'",
    "form-action 'self' https://checkout.stripe.com",
    "base-uri 'self'",
  ].join("; ");
}

function applySecurityHeaders(res: NextResponse) {
  const isProd = process.env.NODE_ENV === "production";
  res.headers.set("Content-Security-Policy", buildCsp(isProd));
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  if (isProd) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}

/* ========= Middleware ========= */

export function middleware(req: NextRequest) {
  if (isAllowlisted(req)) return NextResponse.next();

  if (shouldRateLimit(req)) {
    const bucket = RL_PATHS.find((re) => re.test(req.nextUrl.pathname))?.source ?? "";
    const key = `${ipFrom(req)}:${bucket}`;
    const rl = checkRateLimit(key);
    if (!rl.ok) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rl.resetMs / 1000)),
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

  const res = NextResponse.next();
  applySecurityHeaders(res);
  return res;
}

/* ========= Matcher ========= */

export const config = { matcher: ["/:path*"] };