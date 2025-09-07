// app/api/questions/search/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url)
  const examId = searchParams.get("examId")
  const tagIds = (searchParams.get("tagIds") || "").split(",").filter(Boolean)
  const superTagIds = (searchParams.get("superTagIds") || "").split(",").filter(Boolean)
  const requireAnd = searchParams.get("requireAnd") === "1"
  const includeCases = searchParams.get("includeCases") !== "0"

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
    return NextResponse.json({ items: [], total: 0 })
  }

  // WHERE-Bedingungen
  const whereBase: any = {}
  
  if (examId) {
    whereBase.examId = examId
  }

  // Fragen finden - direkte Prisma-Abfrage
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

  const total = questionIds.size

  return NextResponse.json({
    items: Array.from(questionIds),
    total
  })
}
