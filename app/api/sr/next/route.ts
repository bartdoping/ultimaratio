import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { Prisma } from "@prisma/client"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const url = new URL(req.url)
    const deckId = url.searchParams.get("deckId") || undefined
    const all = url.searchParams.get("all") === "1"

    // Kandidaten bestimmen
    let candidateQIds: string[] = []
    if (deckId) {
      const items = await prisma.deckItem.findMany({
        where: { deckId },
        select: { questionId: true },
      })
      candidateQIds = items.map(i => i.questionId)
    } else if (all) {
      // nur SR-aktivierte Decks
      let srEnabledDecks: { deckId: string }[] = []
      try {
        srEnabledDecks = await prisma.$queryRaw<{ deckId: string }[]>`
          SELECT "deckId" FROM "SRDeckSetting" WHERE "srEnabled" = true
        `
      } catch {
        srEnabledDecks = []
      }
      if (srEnabledDecks.length > 0) {
        const rows = await prisma.deckItem.findMany({
          where: { deckId: { in: srEnabledDecks.map(d => d.deckId) } },
          select: { questionId: true },
        })
        candidateQIds = rows.map(r => r.questionId)
      }
    }

    if (candidateQIds.length === 0) {
      return new NextResponse(null, { status: 204 })
    }

    // Fällige Reviews
    const due = await prisma.reviewItem.findFirst({
      where: {
        userId,
        questionId: { in: candidateQIds },
        dueAt: { lte: new Date() },
      },
      orderBy: { dueAt: "asc" },
      select: { questionId: true },
    })

    let questionId: string | null = due?.questionId ?? null

    // Falls nichts fällig: nimm eine „neue“ Frage ohne ReviewItem und lege sie an (due now)
    if (!questionId) {
      const existing = await prisma.reviewItem.findMany({
        where: { userId, questionId: { in: candidateQIds } },
        select: { questionId: true },
      })
      const seen = new Set(existing.map(e => e.questionId))
      const unseen = candidateQIds.find(qid => !seen.has(qid))
      if (!unseen) return new NextResponse(null, { status: 204 })
      await prisma.reviewItem.create({
        data: {
          userId,
          questionId: unseen,
          dueAt: new Date(),
          interval: 1,
          ease: 2.5,
          lapses: 0,
          suspended: false,
        },
      })
      questionId = unseen
    }

    // Frage laden
    const q = await prisma.question.findUnique({
      where: { id: questionId! },
      select: {
        id: true, stem: true, explanation: true, tip: true,
        options: { orderBy: { id: "asc" }, select: { id: true, text: true, isCorrect: true, explanation: true } }
      },
    })
    if (!q) return new NextResponse(null, { status: 204 })

    // Fällige Gesamtzahl (für UI)
    let dueLeft = 0
    if (deckId) {
      const left = await prisma.$queryRaw<{ cnt: number }[]>`
        SELECT COUNT(*)::int as cnt
        FROM "ReviewItem" ri
        JOIN "DeckItem" di ON di."questionId" = ri."questionId"
        WHERE ri."userId" = ${userId}
          AND ri."dueAt" <= NOW()
          AND di."deckId" = ${deckId}
      `
      dueLeft = left?.[0]?.cnt ?? 0
    } else if (all) {
      try {
        const enabledDecks = await prisma.$queryRaw<{ deckId: string }[]>`
          SELECT "deckId" FROM "SRDeckSetting" WHERE "srEnabled" = true
        `
        if (enabledDecks.length > 0) {
          const left = await prisma.$queryRaw<{ cnt: number }[]>`
            SELECT COUNT(*)::int as cnt
            FROM "ReviewItem" ri
            JOIN "DeckItem" di ON di."questionId" = ri."questionId"
            WHERE ri."userId" = ${userId}
              AND ri."dueAt" <= NOW()
              AND di."deckId" IN (${Prisma.join(enabledDecks.map(d => d.deckId))})
          `
          dueLeft = left?.[0]?.cnt ?? 0
        }
      } catch {}
    }

    return NextResponse.json({ question: q, dueLeft })
  } catch (e) {
    console.error("sr next failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}