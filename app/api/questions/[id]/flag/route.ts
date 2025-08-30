import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

// Next 15: params asynchron
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const { id } = await context.params
    const questionId = id
    if (!questionId) return NextResponse.json({ error: "missing question id" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const flagged = !!body?.flagged

    // Existiert die Frage?
    const q = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    })
    if (!q) return NextResponse.json({ error: "question not found" }, { status: 404 })

    // Flag speichern + Auto-Deck "Markierte Fragen" synchron halten.
    await prisma.$transaction(async (tx) => {
      if (flagged) {
        await tx.userQuestionFlag.upsert({
          where: { userId_questionId: { userId, questionId } },
          update: { flaggedAt: new Date() },
          create: { userId, questionId },
        })

        // Auto-Deck nach Titel suchen (ENUM absichtlich NICHT verwenden)
        const auto = await tx.deck.findFirst({
          where: { userId, isAuto: true, title: "Markierte Fragen" },
          select: { id: true },
        })
        const deckId =
          auto?.id ??
          (await tx.deck.create({
            data: { userId, title: "Markierte Fragen", isAuto: true },
            select: { id: true },
          })).id

        // fortlaufende order
        const agg = await tx.deckItem.aggregate({
          where: { deckId },
          _max: { order: true },
        })
        const nextOrder = (agg._max.order ?? 0) + 1

        await tx.deckItem.upsert({
          where: { deckId_questionId: { deckId, questionId } },
          update: {},
          create: { deckId, questionId, order: nextOrder },
        })
      } else {
        // Flag löschen + Eintrag aus Auto-Deck entfernen
        await tx.userQuestionFlag.deleteMany({ where: { userId, questionId } })

        const auto = await tx.deck.findFirst({
          where: { userId, isAuto: true, title: "Markierte Fragen" },
          select: { id: true },
        })
        if (auto) {
          await tx.deckItem.deleteMany({
            where: { deckId: auto.id, questionId },
          })
        }
      }
    })

    return NextResponse.json({ ok: true, flagged })
  } catch (e) {
    console.error("flag question failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}