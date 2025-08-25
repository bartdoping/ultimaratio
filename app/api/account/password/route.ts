// app/api/account/password/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import bcrypt from "bcryptjs"

export const runtime = "nodejs"

const Schema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 })

  const me = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!me || !me.passwordHash) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Ungültige Eingaben." }, { status: 400 })
  }

  const { oldPassword, newPassword } = parsed.data
  const ok = await bcrypt.compare(oldPassword, me.passwordHash)
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Altes Passwort ist falsch." }, { status: 400 })
  }

  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: hash },
  })

  return NextResponse.json({ ok: true })
}