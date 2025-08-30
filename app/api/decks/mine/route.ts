// app/api/decks/mine/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    // Nur eigene, NICHT-automatische Decks
    const decks = await prisma.deck.findMany({
      where: { userId, isAuto: false },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({ ok: true, items: decks })
  } catch (e) {
    console.error("GET /api/decks/mine failed:", e)
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 })
  }
}