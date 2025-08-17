// app/api/auth/register/route.ts
import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { RegisterSchema } from "@/lib/validators"
import { hashPassword } from "@/lib/password"
import { sendVerificationEmail } from "@/lib/mail"
import { randomInt } from "crypto"

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = RegisterSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 })
  }
  const { name, surname, email, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing?.emailVerifiedAt) {
    return NextResponse.json({ ok: false, error: "E-Mail ist bereits registriert und verifiziert." }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)

  const user = existing
    ? await prisma.user.update({ where: { email }, data: { name, surname, passwordHash } })
    : await prisma.user.create({ data: { name, surname, email, passwordHash, role: "user" } })

  // neuen Code erzeugen (6-stellig) – 15 Minuten gültig
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

  // alte, nicht verbrauchte Codes optional aufbrauchen/entwerten
  await prisma.emailVerification.create({
    data: { userId: user.id, code, expiresAt },
  })

  const info = await sendVerificationEmail(email, code)
  return NextResponse.json({ ok: true, devHint: info.dev ? `DEV-Code: ${code}` : undefined })
}
