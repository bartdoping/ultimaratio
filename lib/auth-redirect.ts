/** Sichere interne Weiterleitung nach Login/Register (keine Open-Redirects). */

export function getSafeCallbackUrl(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || typeof raw !== "string") return fallback
  const trimmed = raw.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback
  if (trimmed.startsWith("/login") || trimmed.startsWith("/register") || trimmed.startsWith("/verify")) {
    return fallback
  }
  return trimmed
}

export function buildLoginHref(callbackUrl: string): string {
  const safe = getSafeCallbackUrl(callbackUrl, "/dashboard")
  return `/login?callbackUrl=${encodeURIComponent(safe)}`
}

export function buildRegisterHref(callbackUrl: string): string {
  const safe = getSafeCallbackUrl(callbackUrl, "/dashboard")
  return `/register?callbackUrl=${encodeURIComponent(safe)}`
}

export function buildVerifyHref(email: string, callbackUrl: string): string {
  const safe = getSafeCallbackUrl(callbackUrl, "/dashboard")
  return `/verify?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(safe)}`
}
