// app/api/account/email/request/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { sendVerificationMail } from "@/lib/mail"

export const runtime = "nodejs"

const BodySchema = z.object({
  newEmail: z.string().email(),
})

function gen6(): string {
  // 6-stellig, führende Nullen möglich
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true },
    })
    if (!me) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Ungültige Eingabe." }, { status: 400 })
    }

    const { newEmail } = parsed.data
    if (newEmail.toLowerCase() === me.email.toLowerCase()) {
      return NextResponse.json({ ok: false, error: "Neue E-Mail ist identisch mit der aktuellen." }, { status: 400 })
    }

    // Prüfen, ob E-Mail bereits von einem anderen Konto benutzt wird
    const exists = await prisma.user.findUnique({ where: { email: newEmail } })
    if (exists) {
      return NextResponse.json({ ok: false, error: "Diese E-Mail wird bereits verwendet." }, { status: 409 })
    }

    // Aufräumen: alle offenen Verifikationen für genau diese Zieladresse entfernen
    await prisma.emailVerification.deleteMany({
      where: { userId: me.id, newEmail, consumedAt: null },
    })

    // neuen Code erzeugen
    const code = gen6()

    // speichern (in deiner Tabelle "EmailVerification")
    await prisma.emailVerification.create({
      data: {
        userId: me.id,
        newEmail,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 Minuten
      },
    })

    // Mail verschicken
    await sendVerificationMail(newEmail, code)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("account/email/request failed:", e)
    return NextResponse.json({ ok: false, error: "E-Mail konnte nicht versendet werden." }, { status: 500 })
  }
}