import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { assertSameOrigin } from "@/lib/security"
import { payloadToQuestion, themenBilanz, trefferquote } from "@/lib/saved-questions"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SEITE_MAX = 50

/**
 * GET /api/questions — die gespeicherten Fragen des angemeldeten Nutzers.
 *
 * `filter`:
 *   "due"   — zur Wiederholung fällig (dueAt <= jetzt)
 *   "wrong" — zuletzt falsch beantwortet
 *   "open"  — noch nie beantwortet
 *   "all"   — alles (Vorgabe)
 *
 * Liefert zusätzlich Zählwerte und die Trefferquote je Thema, damit die
 * Übersicht ohne zweiten Aufruf auskommt.
 */
export async function GET(req: Request) {
  try {
    assertSameOrigin(req)
  } catch {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions).catch(() => null)
  const email = session?.user?.email?.toLowerCase().trim()
  if (!email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const filter = url.searchParams.get("filter") ?? "all"
  const limit = Math.min(SEITE_MAX, Math.max(1, Number(url.searchParams.get("limit")) || 20))
  const jetzt = new Date()

  const where = (() => {
    switch (filter) {
      case "due":
        return { userId: user.id, dueAt: { lte: jetzt } }
      case "wrong":
        return { userId: user.id, lastCorrect: false }
      case "open":
        return { userId: user.id, attempts: 0 }
      default:
        return { userId: user.id }
    }
  })()

  const [zeilen, alle, faellig, falsch, offen, fuerBilanz] = await Promise.all([
    prisma.savedQuestion.findMany({
      where,
      orderBy: filter === "due" ? { dueAt: "asc" } : { createdAt: "desc" },
      take: limit,
    }),
    prisma.savedQuestion.count({ where: { userId: user.id } }),
    prisma.savedQuestion.count({ where: { userId: user.id, dueAt: { lte: jetzt } } }),
    prisma.savedQuestion.count({ where: { userId: user.id, lastCorrect: false } }),
    prisma.savedQuestion.count({ where: { userId: user.id, attempts: 0 } }),
    prisma.savedQuestion.findMany({
      where: { userId: user.id, attempts: { gt: 0 } },
      select: { topic: true, attempts: true, correctCount: true },
      take: 2000,
    }),
  ])

  return NextResponse.json(
    {
      ok: true,
      questions: zeilen.map((z) => ({
        id: z.id,
        topic: z.topic,
        difficulty: z.difficulty,
        mode: z.mode,
        section: z.section,
        stem: z.stem,
        attempts: z.attempts,
        correctCount: z.correctCount,
        quote: trefferquote(z.attempts, z.correctCount),
        lastCorrect: z.lastCorrect,
        dueAt: z.dueAt?.toISOString() ?? null,
        createdAt: z.createdAt.toISOString(),
        question: payloadToQuestion(z.payload),
      })),
      counts: { all: alle, due: faellig, wrong: falsch, open: offen },
      byTopic: themenBilanz(fuerBilanz).slice(0, 12),
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
