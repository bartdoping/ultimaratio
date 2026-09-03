import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"
import { nextReviewState } from "@/lib/saved-questions"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Ermittelt den angemeldeten Nutzer oder null. */
async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions).catch(() => null)
  const email = session?.user?.email?.toLowerCase().trim()
  if (!email) return null
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  return user?.id ?? null
}

/**
 * POST /api/questions/[id] — eine Antwort auf eine gespeicherte Frage erfassen.
 *
 * Body: { correct: boolean }
 *
 * Setzt Versuche, Trefferzahl, Serie und die nächste Fälligkeit. Eine falsch
 * beantwortete Frage ist morgen wieder dran — das ist der eigentliche Zweck
 * der Ablage.
 *
 * Fremde Fragen sind nicht erreichbar: Die Bedingung enthält immer die
 * Nutzer-ID, eine fremde ID liefert 404 statt 403 (keine Existenz-Auskunft).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }

  const userId = await currentUserId()
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  if (typeof body.correct !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "correct_required" },
      { status: 400 }
    )
  }

  const vorher = await prisma.savedQuestion.findFirst({
    where: { id, userId },
    select: { attempts: true, correctCount: true, streak: true },
  })
  if (!vorher) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 })
  }

  const next = nextReviewState(vorher, body.correct)
  const aktualisiert = await prisma.savedQuestion.update({
    where: { id },
    data: {
      attempts: next.attempts,
      correctCount: next.correctCount,
      streak: next.streak,
      lastAnsweredAt: next.lastAnsweredAt,
      lastCorrect: next.lastCorrect,
      dueAt: next.dueAt,
    },
    select: { attempts: true, correctCount: true, dueAt: true, lastCorrect: true },
  })

  return NextResponse.json(
    {
      ok: true,
      attempts: aktualisiert.attempts,
      correctCount: aktualisiert.correctCount,
      lastCorrect: aktualisiert.lastCorrect,
      dueAt: aktualisiert.dueAt?.toISOString() ?? null,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}

/** DELETE /api/questions/[id] — eine gespeicherte Frage entfernen. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }

  const userId = await currentUserId()
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const res = await prisma.savedQuestion.deleteMany({ where: { id, userId } })
  if (res.count === 0) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
}
