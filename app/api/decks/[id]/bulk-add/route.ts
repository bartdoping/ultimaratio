// app/api/decks/[id]/bulk-add/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  })
  if (!me) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  // Deck-Besitz prüfen
  const deck = await prisma.deck.findUnique({
    where: { id: params.id },
    select: { userId: true }
  })
  if (!deck || deck.userId !== me.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const {
    tagIds = [],
    superTagIds = [],
    requireAnd = true,
    includeCases = true,
    examId,
    limit
  } = body as {
    tagIds?: string[]
    superTagIds?: string[]
    requireAnd?: boolean
    includeCases?: boolean
    examId?: string
    limit?: number
  }

  // Effektive Tag-IDs: gewählte Tags + Supertags selbst + alle Kinder der gewählten Supertags
  let effectiveTagIds = [...tagIds, ...superTagIds]
  
  if (superTagIds.length > 0) {
    const children = await prisma.tag.findMany({
      where: {
        parentId: { in: superTagIds }
      },
      select: { id: true }
    })
    effectiveTagIds = Array.from(new Set([
      ...effectiveTagIds,
      ...children.map(c => c.id)
    ]))
  }

  if (effectiveTagIds.length === 0) {
    return NextResponse.json({ error: "no tags selected" }, { status: 400 })
  }

  // WHERE-Bedingungen aufbauen
  const whereBase: any = {}
  
  if (examId) {
    whereBase.examId = examId
  }

  // Passende Fragen finden - direkte Prisma-Abfrage
  let questions: Array<{ id: string; caseId: string | null }> = []

  if (effectiveTagIds.length > 0) {
    // UND-Logik nur anwenden wenn mehr als ein Tag gewählt ist
    const shouldUseAndLogic = requireAnd && effectiveTagIds.length > 1
    
    if (shouldUseAndLogic) {
      // UND-Logik: Finde Fragen, die ALLE gewählten Tags haben
      const questionsWithTagCounts = await prisma.question.findMany({
        where: { 
          ...whereBase,
          tags: {
            some: {
              tagId: { in: effectiveTagIds }
            }
          }
        },
        select: { 
          id: true, 
          caseId: true,
          tags: { 
            select: { tagId: true } 
          } 
        }
      })

      // Filtere nur Fragen, die ALLE gewählten Tags haben
      questions = questionsWithTagCounts
        .filter(q => {
          const questionTagIds = q.tags.map(t => t.tagId)
          return effectiveTagIds.every(tagId => questionTagIds.includes(tagId))
        })
        .map(q => ({ id: q.id, caseId: q.caseId }))
    } else {
      // ODER-Logik: Finde Fragen mit mindestens einem Tag
      questions = await prisma.question.findMany({
        where: { 
          ...whereBase,
          OR: effectiveTagIds.map(tagId => ({
            tags: { some: { tagId } }
          }))
        },
        select: { id: true, caseId: true },
        orderBy: { id: "asc" }
      })
    }
  }

  // Fälle zusammenhalten wenn gewünscht
  let questionIds = new Set(questions.map(q => q.id))
  
  if (includeCases) {
    const caseIds = Array.from(new Set(
      questions.map(q => q.caseId).filter(Boolean)
    )) as string[]
    
    if (caseIds.length > 0) {
      const caseQuestions = await prisma.question.findMany({
        where: { caseId: { in: caseIds } },
        select: { id: true }
      })
      caseQuestions.forEach(q => questionIds.add(q.id))
    }
  }

  // Limit anwenden
  let finalIds = Array.from(questionIds)
  if (typeof limit === "number" && limit > 0) {
    finalIds = finalIds.slice(0, limit)
  }

  // Bereits vorhandene Items ignorieren
  const existing = await prisma.deckItem.findMany({
    where: {
      deckId: params.id,
      questionId: { in: finalIds }
    },
    select: { questionId: true }
  })
  
  const existingSet = new Set(existing.map(e => e.questionId))
  const toAdd = finalIds.filter(id => !existingSet.has(id))

  if (toAdd.length === 0) {
    return NextResponse.json({ 
      ok: true, 
      added: 0,
      total: finalIds.length,
      alreadyExists: finalIds.length
    })
  }

  // Nächste Order-Nummer finden
  const maxOrder = await prisma.deckItem.aggregate({
    where: { deckId: params.id },
    _max: { order: true }
  })
  let startOrder = (maxOrder._max.order ?? -1) + 1

  // Items hinzufügen
  await prisma.deckItem.createMany({
    data: toAdd.map(questionId => ({
      deckId: params.id,
      questionId,
      order: startOrder++
    })),
    skipDuplicates: true
  })

  return NextResponse.json({
    ok: true,
    added: toAdd.length,
    total: finalIds.length,
    alreadyExists: finalIds.length - toAdd.length
  })
}
