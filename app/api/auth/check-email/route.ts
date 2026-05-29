// app/api/auth/check-email/route.ts
//
// Erster Schritt im neuen Auth-Wizard: prüft, ob es zur eingegebenen E-Mail
// bereits einen Account gibt. UX entscheidet danach, ob Login- oder
// Registrierungs-Schritt gezeigt wird.
//
// Sicherheits-Hinweise:
//  - Rate-Limited per IP + E-Mail (gegen User-Enumeration).
//  - Optional CAPTCHA — wenn `TURNSTILE_SECRET_KEY` gesetzt ist, MUSS ein
//    Turnstile-Token mitgeliefert werden.
//  - Antwort enthält nur `exists: boolean` und ob CAPTCHA gefordert war,
//    nichts darüber hinaus (kein Name, keine Status-Details).
import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db"
import {
  rateLimitKey,
  tryAcquireAuth,
} from "@/lib/auth-rate-limit"
import { isCaptchaConfigured, verifyCaptchaToken } from "@/lib/captcha"

export const runtime = "nodejs"

const Schema = z.object({
  email: z.string().email().max(254),
  captchaToken: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 })
    }
    const email = parsed.data.email.toLowerCase().trim()

    const ip = rateLimitKey(req)
    const rl = tryAcquireAuth("checkEmail", `${ip}|${email}`)
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "rate_limited", retryAfterMs: rl.retryAfterMs },
        { status: 429 }
      )
    }

    if (isCaptchaConfigured()) {
      const verify = await verifyCaptchaToken(parsed.data.captchaToken, ip)
      if (!verify.ok) {
        return NextResponse.json(
          { ok: false, error: "captcha_failed" },
          { status: 400 }
        )
      }
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    })

    // Existiert User? Hat er ein nutzbares Passwort, oder ist er reiner OAuth-User?
    const exists = !!existing
    const hasPassword = exists && !existing!.passwordHash.startsWith("oauth_")

    return NextResponse.json({
      ok: true,
      exists,
      hasPassword,
      captchaRequired: isCaptchaConfigured(),
    })
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 })
  }
}
