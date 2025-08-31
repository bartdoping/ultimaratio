// app/api/decks/[id]/sr-settings/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id: deckId } = await ctx.params

  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId }, select: { id: true } })
  if (!deck) return NextResponse.json({ error: "not found" }, { status: 404 })

  const st = await prisma.sRDeckSetting.findUnique({ where: { deckId } })
  return NextResponse.json(st ?? { deckId, srEnabled: false })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id: deckId } = await ctx.params

  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId }, select: { id: true } })
  if (!deck) return NextResponse.json({ error: "not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const data: any = {}
  if (typeof body?.srEnabled === "boolean") data.srEnabled = body.srEnabled
  if (Number.isFinite(body?.newPerDay)) data.newPerDay = Math.max(0, Math.floor(body.newPerDay))
  if (Number.isFinite(body?.reviewsPerDay)) data.reviewsPerDay = Math.max(0, Math.floor(body.reviewsPerDay))
  if (typeof body?.startEase === "number") data.startEase = body.startEase
  if (Array.isArray(body?.learningSteps)) data.learningSteps = body.learningSteps
  if (typeof body?.suspended === "boolean") data.suspended = body.suspended

  const st = await prisma.sRDeckSetting.upsert({
    where: { deckId },
    update: data,
    create: { deckId, ...data },
  })
  return NextResponse.json(st)
}