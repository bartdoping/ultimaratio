import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const attemptId = params.id
    if (!attemptId) {
      return NextResponse.json({ ok: false, error: "Missing attempt id" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const Parsed = z.object({ elapsedSec: z.number().int().nonnegative().optional() }).safeParse(body)
    const clientElapsed = Parsed.success ? Parsed.data.elapsedSec : undefined

    // Nutzer ermitteln
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

    // Attempt prüfen (offen, gehört Nutzer)
    const attempt = await prisma.attempt.findFirst({
      where: { id: attemptId, userId: me.id, finishedAt: null },
      select: { id: true, elapsedSec: true },
    })
    if (!attempt) {
      // still ok → sendBeacon soll nicht rot werden
      return NextResponse.json({ ok: true, skipped: true })
    }

    const nextElapsed =
      typeof clientElapsed === "number"
        ? Math.max(attempt.elapsedSec ?? 0, clientElapsed)
        : (attempt.elapsedSec ?? 0)

    if ((attempt.elapsedSec ?? 0) >= nextElapsed) {
      return NextResponse.json({ ok: true, noop: true, elapsedSec: attempt.elapsedSec ?? 0 })
    }

    await prisma.attempt.update({
      where: { id: attempt.id },
      data: { elapsedSec: nextElapsed },
    })

    return NextResponse.json({ ok: true, elapsedSec: nextElapsed })
  } catch (e) {
    console.error("heartbeat failed:", e)
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 })
  }
}