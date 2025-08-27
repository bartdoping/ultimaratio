// app/api/decks/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const decks = await prisma.deck.findMany({
    where: { userId: me.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, description: true, _count: { select: { items: true } }, updatedAt: true },
  })

  return NextResponse.json({ items: decks })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }) }
  const { title, description } = body ?? {}
  if (!title || typeof title !== "string") return NextResponse.json({ error: "missing title" }, { status: 400 })

  const deck = await prisma.deck.create({
    data: { userId: me.id, title: title.trim(), description: description ? String(description) : null },
    select: { id: true },
  })
  return NextResponse.json({ id: deck.id })
}