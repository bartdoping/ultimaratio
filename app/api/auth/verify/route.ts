// app/api/auth/verify/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { z } from "zod"
import { rateLimitKey, tryAcquireAuth } from "@/lib/auth-rate-limit"

export const runtime = "nodejs"

const Payload = z.object({
  email: z.string().email().max(254),
  code: z.string().min(4).max(10),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = Payload.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  const { email, code } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  const rl = tryAcquireAuth("codeVerify", `${rateLimitKey(req)}|${normalizedEmail}`)
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    )
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (!user) return NextResponse.json({ ok: false }, { status: 400 })

  const row = await prisma.emailVerification.findFirst({
    where: {
      userId: user.id,
      code,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })
  if (!row) return NextResponse.json({ ok: false }, { status: 400 })

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerification.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    }),
  ])

  return NextResponse.json({ ok: true })
}
