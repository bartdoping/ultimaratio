// app/api/auth/register/route.ts
//
// Schritt 2 (neue User) im Auth-Wizard. Erwartet jetzt nur noch
// E-Mail + Passwort — Vorname/Nachname wurden aus dem Flow entfernt.
// Das User-Modell hat `name`/`surname` als `String` Pflichtfelder; wir
// speichern leere Strings, ohne die DB-Migration anzufassen.
import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db"
import { hashPassword } from "@/lib/password"
import { sendVerificationMail } from "@/lib/mail"
import { rateLimitKey, tryAcquireAuth } from "@/lib/auth-rate-limit"
import { isCaptchaConfigured, verifyCaptchaToken } from "@/lib/captcha"
import { notifyAdminNewUser } from "@/lib/admin-notify"

export const runtime = "nodejs"

const RegisterSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  // Captcha-Token darf string, null oder undefined sein. JSON-Serializer
  // schickt null statt undefined, wenn der State im Client `null` ist.
  captchaToken: z.string().nullish(),
})

function generateSixDigitCode(): string {
  return Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0")
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = RegisterSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 })
    }

    const email = parsed.data.email.toLowerCase().trim()
    const password = parsed.data.password

    const ip = rateLimitKey(req)
    const rl = tryAcquireAuth("register", `${ip}|${email}`)
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

    const exists = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, emailVerifiedAt: true },
    })
    if (exists) {
      // Keine Detail-Info nach außen — schlanker "email_taken"-Fehler reicht;
      // die UI verarbeitet ihn als Hinweis auf Login-Step.
      return NextResponse.json({ ok: false, error: "email_taken" }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        // Pflicht-Spalten im aktuellen Schema. Wir setzen leeren String,
        // statt Migration in dieser Runde umzusetzen.
        name: "",
        surname: "",
        passwordHash,
        role: "user",
      },
      select: { id: true, email: true },
    })

    const code = generateSixDigitCode()
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    })

    // Code per Mail senden — Fehler still schlucken (User existiert bereits in DB,
    // er kann den Resend-Endpoint nutzen). KEINE E-Mail / kein Code im Log.
    try {
      await sendVerificationMail(user.email, code)
    } catch (emailError) {
      console.error("register: mail send failed", {
        message: (emailError as Error)?.message?.slice(0, 200),
      })
    }

    // Admin-Benachrichtigung (best-effort, blockiert die Registrierung nicht).
    // Bewusst nicht awaiten, damit der Client schneller die OK-Antwort sieht.
    void notifyAdminNewUser(user.email)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("register error", {
      message: (err as Error)?.message?.slice(0, 200),
    })
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 })
  }
}
