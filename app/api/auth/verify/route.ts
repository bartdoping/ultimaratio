// app/api/auth/verify/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { VerifySchema } from "@/lib/validators"

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = VerifySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 })
  }
  const { email, code } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ ok: false, error: "Unbekannte E-Mail." }, { status: 404 })

  const token = await prisma.emailVerification.findFirst({
    where: { userId: user.id, code, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
  })
  if (!token) return NextResponse.json({ ok: false, error: "Code ungültig oder abgelaufen." }, { status: 400 })

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerification.update({ where: { id: token.id }, data: { consumedAt: new Date() } }),
  ])

  return NextResponse.json({ ok: true })
}
