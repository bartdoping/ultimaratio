// app/api/decks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const deck = await prisma.deck.findFirst({
    where: { id, userId: me.id },
    select: {
      id: true,
      title: true,
      description: true,
      items: {
        orderBy: { order: "asc" },
        select: {
          questionId: true,
          order: true,
          question: {
            select: {
              id: true,
              stem: true,
              case: { select: { title: true } },
              exam: { select: { title: true } },
              tags: { select: { tag: { select: { slug: true, name: true } } } },
            },
          },
        },
      },
    },
  })
  if (!deck) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json({ deck })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }) }
  const { title, description } = body ?? {}
  if (!title || typeof title !== "string") return NextResponse.json({ error: "missing title" }, { status: 400 })

  const deck = await prisma.deck.update({
    where: { id, userId: me.id },
    data: { title: title.trim(), description: description ? String(description) : null },
    select: { id: true },
  })
  return NextResponse.json({ ok: true, id: deck.id })
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  await prisma.deck.delete({ where: { id, userId: me.id } })
  return NextResponse.json({ ok: true })
}