// app/api/decks/[id]/items/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

type PostBody =
  | { questionId: string; caseId?: undefined }
  | { caseId: string; questionId?: undefined }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: deckId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // Ownership des Decks
  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: me.id },
    select: { id: true },
  })
  if (!deck) return NextResponse.json({ error: "deck not found" }, { status: 404 })

  let body: PostBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  // Einzelne Frage hinzufügen
  if (body.questionId) {
    const q = await prisma.question.findUnique({
      where: { id: body.questionId },
      select: { id: true, examId: true, caseId: true },
    })
    if (!q) return NextResponse.json({ error: "question not found" }, { status: 404 })

    // nur erworbene Exams
    const purchase = await prisma.purchase.findFirst({
      where: { userId: me.id, examId: q.examId },
      select: { id: true },
    })
    if (!purchase) return NextResponse.json({ error: "no access to exam" }, { status: 403 })

    const existing = await prisma.deckItem.findUnique({
      where: { deckId_questionId: { deckId, questionId: q.id } },
      select: { deckId: true },
    })
    if (existing) return NextResponse.json({ ok: true, already: true })

    const last = await prisma.deckItem.findFirst({
      where: { deckId },
      orderBy: { order: "desc" },
      select: { order: true },
    })
    const nextOrder = (last?.order ?? -1) + 1

    await prisma.deckItem.create({
      data: { deckId, questionId: q.id, order: nextOrder },
    })

    return NextResponse.json({ ok: true, added: 1 })
  }

  // Gesamten Fall hinzufügen
  if (body.caseId) {
    const kase = await prisma.questionCase.findUnique({
      where: { id: body.caseId },
      select: {
        id: true,
        examId: true,
        questions: { select: { id: true } },
      },
    })
    if (!kase) return NextResponse.json({ error: "case not found" }, { status: 404 })

    // Zugriff?
    const purchase = await prisma.purchase.findFirst({
      where: { userId: me.id, examId: kase.examId },
      select: { id: true },
    })
    if (!purchase) return NextResponse.json({ error: "no access to exam" }, { status: 403 })

    const qids = kase.questions.map((q) => q.id)
    if (qids.length === 0) return NextResponse.json({ ok: true, added: 0 })

    const existing = await prisma.deckItem.findMany({
      where: { deckId, questionId: { in: qids } },
      select: { questionId: true },
    })
    const existingSet = new Set(existing.map((e) => e.questionId))
    const toAdd = qids.filter((id) => !existingSet.has(id))

    if (toAdd.length === 0) {
      return NextResponse.json({ ok: true, added: 0, already: true })
    }

    const last = await prisma.deckItem.findFirst({
      where: { deckId },
      orderBy: { order: "desc" },
      select: { order: true },
    })
    let nextOrder = (last?.order ?? -1) + 1

    const data = toAdd.map((questionId) => ({
      deckId,
      questionId,
      order: nextOrder++,
      addedAt: new Date(),
    }))

    // @ts-expect-error: createMany accepts our fields
    await prisma.deckItem.createMany({ data, skipDuplicates: true })

    return NextResponse.json({ ok: true, added: toAdd.length })
  }

  return NextResponse.json({ error: "missing questionId or caseId" }, { status: 400 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: deckId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: me.id },
    select: { id: true },
  })
  if (!deck) return NextResponse.json({ error: "deck not found" }, { status: 404 })

  let body: { questionId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
  if (!body.questionId) {
    return NextResponse.json({ error: "missing questionId" }, { status: 400 })
  }

  await prisma.deckItem.delete({
    where: { deckId_questionId: { deckId, questionId: body.questionId } },
  })

  return NextResponse.json({ ok: true })
}