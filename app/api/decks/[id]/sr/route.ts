// app/api/decks/[id]/sr/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { requireProDecksAccess } from "@/lib/decks-access"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const denied = await requireProDecksAccess(session.user.email)
  if (denied) return denied
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const userId = me.id
  const { id: deckId } = await ctx.params

  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId }, select: { id: true } })
  if (!deck) return NextResponse.json({ error: "not found" }, { status: 404 })

  const st = await prisma.sRDeckSetting.findUnique({ where: { deckId } })
  return NextResponse.json({ srEnabled: !!st?.srEnabled, suspended: !!st?.suspended, overrides: st ?? null })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const denied = await requireProDecksAccess(session.user.email)
  if (denied) return denied
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const userId = me.id
  const { id: deckId } = await ctx.params

  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId }, select: { id: true } })
  if (!deck) return NextResponse.json({ error: "not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const enable = body?.enable === true

  await prisma.$transaction(async (tx) => {
    await tx.sRDeckSetting.upsert({
      where: { deckId },
      update: { srEnabled: enable },
      create: { deckId, srEnabled: enable },
    })

    if (enable) {
      // Alle Fragen des Decks initialisieren (falls ReviewItem fehlt)
      const items = await tx.deckItem.findMany({ where: { deckId }, select: { questionId: true } })
      if (items.length > 0) {
        const now = new Date()
        for (const it of items) {
          await tx.reviewItem.upsert({
            where: { userId_questionId: { userId, questionId: it.questionId } },
            update: {},
            create: {
              userId,
              questionId: it.questionId,
              dueAt: now,
              interval: 1,
              ease: 2.5,
              lapses: 0,
              suspended: false,
            },
          })
        }
      }
    }
  })

  return NextResponse.json({ ok: true, srEnabled: enable })
}