import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"

export const runtime = "nodejs"

const ZIELE = new Set([10, 20, 30, 50, 100])

/**
 * POST /api/account/reminders — Lern-Erinnerungen und Tagesziel.
 * Body: { optIn?: boolean, dailyGoal?: number }
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false }, { status: 403 })
  }
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase().trim()
  if (!email) return NextResponse.json({ ok: false }, { status: 401 })
  const me = await prisma.user.findUnique({ where: { email }, select: { id: true, reminderToken: true } })
  if (!me) return NextResponse.json({ ok: false }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const data: { reminderOptIn?: boolean; reminderToken?: string; dailyGoal?: number } = {}
  if (typeof body.optIn === "boolean") {
    data.reminderOptIn = body.optIn
    // Abmeldetoken für den Link in jeder Mail — funktioniert ohne Login.
    if (body.optIn && !me.reminderToken) data.reminderToken = randomBytes(24).toString("base64url")
  }
  if (typeof body.dailyGoal === "number" && ZIELE.has(body.dailyGoal)) data.dailyGoal = body.dailyGoal

  const u = await prisma.user.update({ where: { id: me.id }, data, select: { reminderOptIn: true, dailyGoal: true } })
  return NextResponse.json({ ok: true, optIn: u.reminderOptIn, dailyGoal: u.dailyGoal })
}
