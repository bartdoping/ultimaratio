/** Sichere interne Weiterleitung nach Login/Register (keine Open-Redirects). */

import { isAdminRole } from "@/lib/platform-access"

export function getDefaultAuthFallback(role?: string | null): string {
  return isAdminRole(role ?? undefined) ? "/dashboard" : "/generator"
}

export function getSafeCallbackUrl(
  raw: string | null | undefined,
  fallback = "/generator"
): string {
  if (!raw || typeof raw !== "string") return fallback
  const trimmed = raw.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback
  if (trimmed.startsWith("/login") || trimmed.startsWith("/register") || trimmed.startsWith("/verify")) {
    return fallback
  }
  return trimmed
}

export function buildLoginHref(callbackUrl: string, role?: string | null): string {
  const safe = getSafeCallbackUrl(callbackUrl, getDefaultAuthFallback(role))
  return `/login?callbackUrl=${encodeURIComponent(safe)}`
}

export function buildRegisterHref(callbackUrl: string, role?: string | null): string {
  const safe = getSafeCallbackUrl(callbackUrl, getDefaultAuthFallback(role))
  return `/register?callbackUrl=${encodeURIComponent(safe)}`
}

export function buildVerifyHref(email: string, callbackUrl: string, role?: string | null): string {
  const safe = getSafeCallbackUrl(callbackUrl, getDefaultAuthFallback(role))
  return `/verify?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(safe)}`
}
