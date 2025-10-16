import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!me) {
      return NextResponse.json({ error: "user not found" }, { status: 401 })
    }
    const userId = me.id

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