/**
 * Optionale Cloudflare-Turnstile-Integration für Mensch-Verifikation.
 *
 * Aktiv, sobald `TURNSTILE_SECRET_KEY` gesetzt ist. Der Client braucht
 * zusätzlich `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, um das Widget zu rendern.
 * Wenn nichts gesetzt ist, ist Captcha komplett aus — der Code bleibt
 * funktional und liefert beim Verifizieren `ok: true` (No-Op).
 *
 * Keine zusätzliche Dependency: wir nutzen direkt die Turnstile-Verify-API.
 */

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export function isCaptchaConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY?.trim()
}

export function captchaSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
  return key && key.length > 0 ? key : null
}

export type CaptchaResult =
  | { ok: true; disabled?: boolean }
  | { ok: false; reason: string }

/**
 * Token serverseitig verifizieren. Aufrufer übergibt das vom Client
 * empfangene Token (`cf-turnstile-response`).
 */
export async function verifyCaptchaToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<CaptchaResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    // Captcha nicht konfiguriert → kein Check, nicht blockieren.
    return { ok: true, disabled: true }
  }
  if (!token || typeof token !== "string") {
    return { ok: false, reason: "missing_token" }
  }

  const form = new URLSearchParams()
  form.append("secret", secret)
  form.append("response", token)
  if (remoteIp) form.append("remoteip", remoteIp)

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      // Kurzer Timeout, damit Auth-Endpoints nicht hängen.
      signal: AbortSignal.timeout(7_000),
    })
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] }
    if (data?.success) return { ok: true }
    return { ok: false, reason: (data?.["error-codes"]?.[0] ?? "verification_failed") }
  } catch {
    return { ok: false, reason: "verify_unreachable" }
  }
}
