// app/api/auth/code/resend/route.ts
//
// Sendet einen frischen 6-stelligen E-Mail-Bestätigungscode. Rate-limited.
// Antwort ist immer 200, um User-Enumeration zu vermeiden — wenn die E-Mail
// nicht existiert oder schon verifiziert ist, wird einfach nichts gesendet.
import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db"
import { sendVerificationMail } from "@/lib/mail"
import { rateLimitKey, tryAcquireAuth } from "@/lib/auth-rate-limit"

export const runtime = "nodejs"

const Schema = z.object({
  email: z.string().email().max(254),
})

function generateSixDigitCode(): string {
  return Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0")
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      // Selbe neutrale Antwort wie bei Erfolg → keine Enumeration.
      return NextResponse.json({ ok: true })
    }
    const email = parsed.data.email.toLowerCase().trim()

    const rl = tryAcquireAuth("codeResend", `${rateLimitKey(req)}|${email}`)
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "rate_limited", retryAfterMs: rl.retryAfterMs },
        { status: 429 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true },
    })

    if (user && !user.emailVerifiedAt) {
      const code = generateSixDigitCode()
      await prisma.emailVerification.create({
        data: {
          userId: user.id,
          code,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      })
      try {
        await sendVerificationMail(email, code)
      } catch (e) {
        console.error("code/resend: mail send failed", {
          message: (e as Error)?.message?.slice(0, 200),
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("code/resend error", {
      message: (err as Error)?.message?.slice(0, 200),
    })
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 })
  }
}
