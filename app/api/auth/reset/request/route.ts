// app/api/auth/reset/request/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db"
import { sendPasswordResetMail } from "@/lib/mail"
import crypto from "node:crypto"

export const runtime = "nodejs"

const Payload = z.object({ email: z.string().email() })
const token = () => crypto.randomBytes(24).toString("base64url")

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = Payload.safeParse(body)
    if (!parsed.success) return NextResponse.json({ ok: true }) // generisch

    const email = parsed.data.email.toLowerCase().trim()
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } })
    if (!user) return NextResponse.json({ ok: true })

    const t = token()
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        code: t,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 Minuten
      },
    })

    await sendPasswordResetMail(user.email, t)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("reset request error", e)
    return NextResponse.json({ ok: true })
  }
}