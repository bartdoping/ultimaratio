// app/api/account/email/confirm/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

const BodySchema = z.object({
  newEmail: z.string().email(),
  code: z.string().min(6).max(6),
})

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

    const { newEmail, code } = parsed.data

    // passenden, nicht verbrauchten und nicht abgelaufenen Eintrag suchen
    const ver = await prisma.emailVerification.findFirst({
      where: {
        userId: me.id,
        newEmail,
        code,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: "desc" },
    })

    if (!ver) {
      return NextResponse.json({ ok: false, error: "Code ungültig oder abgelaufen." }, { status: 400 })
    }

    // nochmal sicherstellen, dass Zieladresse nicht vergeben ist (Rennen)
    const conflict = await prisma.user.findUnique({ where: { email: newEmail } })
    if (conflict) {
      return NextResponse.json({ ok: false, error: "Diese E-Mail wird bereits verwendet." }, { status: 409 })
    }

    // Benutzer-E-Mail aktualisieren + Verifikation als verbraucht markieren
    await prisma.$transaction([
      prisma.user.update({ where: { id: me.id }, data: { email: newEmail } }),
      prisma.emailVerification.update({
        where: { id: ver.id },
        data: { consumedAt: new Date() },
      }),
      // optional: andere offene Codes für dieselbe Zieladresse invalidieren
      prisma.emailVerification.updateMany({
        where: { userId: me.id, newEmail, consumedAt: null, id: { not: ver.id } },
        data: { consumedAt: new Date() },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("account/email/confirm failed:", e)
    return NextResponse.json({ ok: false, error: "Aktualisierung fehlgeschlagen." }, { status: 500 })
  }
}