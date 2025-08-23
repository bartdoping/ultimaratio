// app/api/auth/reset/confirm/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/db"
import { hashPassword } from "@/lib/password"

export const runtime = "nodejs"

const Payload = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = Payload.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 })
    }

    const { token, password } = parsed.data

    const row = await prisma.emailVerification.findFirst({
      where: {
        code: token,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, userId: true },
    })

    if (!row) {
      return NextResponse.json({ ok: false, error: "invalid or expired token" }, { status: 400 })
    }

    const pw = await hashPassword(password)

    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { passwordHash: pw } }),
      prisma.emailVerification.update({ where: { id: row.id }, data: { consumedAt: new Date() } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("reset confirm error", e)
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 })
  }
}