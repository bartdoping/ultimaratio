import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { z } from "zod"

export const runtime = "nodejs"

const BodySchema = z.object({
  questionId: z.string().min(1),
  deckIds: z.array(z.string().min(1)).min(1),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 })
    }
    const { questionId, deckIds } = parsed.data

    // Frage validieren
    const q = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    })
    if (!q) return NextResponse.json({ error: "question not found" }, { status: 404 })

    // Nur eigene Decks zulassen
    const decks = await prisma.deck.findMany({
      where: { id: { in: deckIds }, userId },
      select: { id: true },
    })
    if (decks.length === 0) {
      return NextResponse.json({ error: "no valid decks" }, { status: 400 })
    }

    // Interaktive Transaktion verwenden (tx.*), nicht Array-Form
    const results = await prisma.$transaction(async (tx) => {
      const out: { deckId: string; created: boolean }[] = []
      for (const d of decks) {
        // Schon vorhanden?
        const exists = await tx.deckItem.count({
          where: { deckId: d.id, questionId },
        })
        if (exists > 0) {
          out.push({ deckId: d.id, created: false })
          continue
        }

        // ans Ende des Decks anhängen
        const agg = await tx.deckItem.aggregate({
          where: { deckId: d.id },
          _max: { order: true },
        })
        const nextOrder = (agg._max.order ?? 0) + 1

        try {
          await tx.deckItem.create({
            data: { deckId: d.id, questionId, order: nextOrder },
          })
          out.push({ deckId: d.id, created: true })
        } catch (e: any) {
          if (e?.code === "P2002") {
            out.push({ deckId: d.id, created: false })
          } else {
            throw e
          }
        }
      }
      return out
    })

    const addedTo = results.filter(r => r.created).map(r => r.deckId)
    const skipped = results.filter(r => !r.created).map(r => r.deckId)

    return NextResponse.json({ ok: true, addedTo, skipped })
  } catch (e) {
    console.error("add-question failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}