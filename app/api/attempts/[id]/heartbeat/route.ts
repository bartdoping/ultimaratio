import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = "then" in (ctx.params as any)
      ? await (ctx.params as Promise<{ id: string }>)
      : (ctx.params as { id: string })

    const attemptId = id
    if (!attemptId) {
      return NextResponse.json({ ok: false, error: "Missing attempt id" }, { status: 400 })
    }

    // Falls versehentlich Practice-IDs hier landen: no-op
    if (attemptId.startsWith("practice:")) {
      const body = await req.json().catch(() => ({}))
      const Parsed = z.object({ elapsedSec: z.number().int().nonnegative().optional() }).safeParse(body)
      const clientElapsed = Parsed.success ? Parsed.data.elapsedSec : 0
      return NextResponse.json({ ok: true, skipped: true, elapsedSec: clientElapsed ?? 0 })
    }

    const body = await req.json().catch(() => ({}))
    const Parsed = z.object({ elapsedSec: z.number().int().nonnegative().optional() }).safeParse(body)
    const clientElapsed = Parsed.success ? Parsed.data.elapsedSec : undefined

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: { userId: true, finishedAt: true, elapsedSec: true },
    })
    if (!attempt || attempt.userId !== (session.user as any).id) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    }
    if (attempt.finishedAt) {
      return NextResponse.json({ ok: true, skipped: true, elapsedSec: attempt.elapsedSec ?? 0 })
    }

    const nextElapsed =
      typeof clientElapsed === "number"
        ? Math.max(attempt.elapsedSec ?? 0, clientElapsed)
        : (attempt.elapsedSec ?? 0)

    if ((attempt.elapsedSec ?? 0) >= nextElapsed) {
      return NextResponse.json({ ok: true, noop: true, elapsedSec: attempt.elapsedSec ?? 0 })
    }

    await prisma.attempt.update({
      where: { id: attemptId },
      data: { elapsedSec: nextElapsed },
    })

    return NextResponse.json({ ok: true, elapsedSec: nextElapsed })
  } catch (e) {
    console.error("heartbeat failed:", e)
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 })
  }
}