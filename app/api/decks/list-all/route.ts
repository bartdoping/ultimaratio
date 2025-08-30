// app/api/decks/list-all/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const decks = await prisma.deck.findMany({
      where: { userId },
      select: { id: true, /* optional: name/title etc. */ },
      orderBy: { id: "asc" },
    })

    // virtuelle Auto-Decks anhängen
    const autoDecks = [
      { id: "auto:flagged", name: "Markierte Fragen", isAuto: true },
      { id: "auto:wrong",   name: "Falsch beantwortet", isAuto: true },
    ]

    // Du kannst hier optional counts beilegen:
    // const flaggedCount = await prisma.userQuestionFlag.count({ where: { userId } })
    // const wrongCount   = await prisma.userQuestionStat.count({ where: { userId, wrongCount: { gt: 0 } } })

    // vereinheitlichen (falls deine Decks 'name' oder 'title' nutzen, passe das Feld an)
    const normalized = decks.map(d => ({ id: d.id, name: (d as any).name ?? (d as any).title ?? "Deck", isAuto: false }))

    return NextResponse.json({ decks: [...autoDecks, ...normalized] })
  } catch (e) {
    console.error("list-all decks failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}