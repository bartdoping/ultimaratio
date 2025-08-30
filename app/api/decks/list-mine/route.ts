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
      where: { userId, isAuto: false },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
    })

    return NextResponse.json({ decks })
  } catch (e) {
    console.error("list-mine failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}