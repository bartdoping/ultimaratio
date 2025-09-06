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

  if (effectiveTagIds.length > 0) {
    if (requireAnd && effectiveTagIds.length > 1) {
      // UND-Logik: Frage muss alle Tags haben (nur wenn mehr als ein Tag)
      whereBase.AND = effectiveTagIds.map(tagId => ({
        tags: { some: { tagId } }
      }))
    } else {
      // ODER-Logik: Frage muss mindestens einen Tag haben
      // (auch bei UND wenn nur ein Tag, da UND mit einem Tag = ODER)
      whereBase.OR = effectiveTagIds.map(tagId => ({
        tags: { some: { tagId } }
      }))
    }
  }

  // Fragen finden
  const questions = await prisma.question.findMany({
    where: whereBase,
    select: { id: true, caseId: true },
    orderBy: { id: "asc" }
  })

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
