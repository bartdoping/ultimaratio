// app/api/decks/[id]/items/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"
type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }) }
  const { questionId } = body ?? {}
  if (!questionId) return NextResponse.json({ error: "missing questionId" }, { status: 400 })

  // Prüfen: Deck gehört mir
  const deck = await prisma.deck.findFirst({ where: { id, userId: me.id }, select: { id: true } })
  if (!deck) return NextResponse.json({ error: "deck not found" }, { status: 404 })

  // Prüfen: Frage gehört zu gekauften Exams
  const canUse = await prisma.question.findFirst({
    where: { id: questionId, exam: { purchases: { some: { userId: me.id } } } },
    select: { id: true },
  })
  if (!canUse) return NextResponse.json({ error: "no access to question" }, { status: 403 })

  // Einfügen, falls nicht vorhanden
  const exists = await prisma.deckItem.findUnique({ where: { deckId_questionId: { deckId: id, questionId } } })
  if (exists) return NextResponse.json({ ok: true })

  const maxOrder = await prisma.deckItem.aggregate({
    where: { deckId: id },
    _max: { order: true },
  })

  await prisma.deckItem.create({
    data: { deckId: id, questionId, order: (maxOrder._max.order ?? -1) + 1 },
  })

  await prisma.deck.update({ where: { id }, data: { updatedAt: new Date() } })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }) }
  const { questionId } = body ?? {}
  if (!questionId) return NextResponse.json({ error: "missing questionId" }, { status: 400 })

  // Ownership des Decks sicherstellen
  const deck = await prisma.deck.findFirst({ where: { id, userId: me.id }, select: { id: true } })
  if (!deck) return NextResponse.json({ error: "deck not found" }, { status: 404 })

  await prisma.deckItem.delete({ where: { deckId_questionId: { deckId: id, questionId } } })
  await prisma.deck.update({ where: { id }, data: { updatedAt: new Date() } })

  return NextResponse.json({ ok: true })
}