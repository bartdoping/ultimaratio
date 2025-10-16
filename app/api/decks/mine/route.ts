// app/api/decks/mine/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!me) {
      return NextResponse.json({ ok: false, error: "user not found" }, { status: 401 })
    }
    const userId = me.id

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