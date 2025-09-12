// app/api/attempts/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null) as {
    examId?: string
    tagIds?: string[]
    superTagIds?: string[]
    requireAnd?: boolean
    includeCases?: boolean
    limit?: number
  } | null
  
  const {
    examId,
    tagIds = [],
    superTagIds = [],
    requireAnd = true,
    includeCases = true,
    limit
  } = body || {}
  
  if (!examId) {
    return NextResponse.json({ ok: false, error: "missing examId" }, { status: 400 })
  }

  // Benutzer ermitteln
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) {
    return NextResponse.json({ ok: false, error: "user not found" }, { status: 401 })
  }

  // Existiert die Prüfung?
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, isPublished: true },
  })
  if (!exam || !exam.isPublished) {
    return NextResponse.json({ ok: false, error: "exam not found" }, { status: 404 })
  }

  // Kauf checken
  const hasPurchase = await prisma.purchase.findUnique({
    where: { userId_examId: { userId: me.id, examId } },
    select: { id: true },
  })
  if (!hasPurchase) {
    return NextResponse.json({ ok: false, error: "not purchased" }, { status: 403 })
  }

  // Gibt es bereits einen offenen Versuch? -> reuse (nur wenn keine Filter angewendet werden)
  if (tagIds.length === 0 && superTagIds.length === 0) {
    const existing = await prisma.attempt.findFirst({
      where: { userId: me.id, examId, finishedAt: null },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ ok: true, attemptId: existing.id, reused: true })
    }
  }

  // Fragen basierend auf Tags filtern
  let questionIds: string[] = []
  
  if (tagIds.length > 0 || superTagIds.length > 0) {
    // Debug-Log
    console.log("API Debug - Received:", { tagIds, superTagIds, requireAnd })
    
    // Lade Tag-Hierarchie für UND-Logik
    let tagHierarchy: { [key: string]: string[] } = {}
    
    if (superTagIds.length > 0) {
      const children = await prisma.tag.findMany({
        where: {
          parentId: { in: superTagIds }
        },
        select: { id: true, parentId: true }
      })
      
      // Erstelle Hierarchie-Map
      superTagIds.forEach(superTagId => {
        tagHierarchy[superTagId] = [superTagId, ...children.filter(c => c.parentId === superTagId).map(c => c.id)]
      })
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

    // Für UND-Logik: Verwende die ursprünglich gewählten Tags (nicht die effektiven)
    const originalSelectedTags = [...tagIds, ...superTagIds]

    // Fragen finden - direkte Prisma-Abfrage
    let questions: Array<{ id: string; caseId: string | null }> = []

    if (effectiveTagIds.length > 0) {
      // UND-Logik nur anwenden wenn mehr als ein ursprünglich gewähltes Tag vorhanden ist
      const shouldUseAndLogic = requireAnd && originalSelectedTags.length > 1
      
      console.log("API Debug - Effective Tags:", { 
        effectiveTagIds, 
        originalSelectedTags,
        shouldUseAndLogic, 
        requireAnd, 
        effectiveTagIdsLength: effectiveTagIds.length 
      })
      
      if (shouldUseAndLogic) {
        // UND-Logik: Finde Fragen, die ALLE ursprünglich gewählten Tags haben
        const questionsWithTagCounts = await prisma.question.findMany({
          where: { 
            examId,
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

        // Filtere nur Fragen, die ALLE ursprünglich gewählten Tags haben
        questions = questionsWithTagCounts
          .filter(q => {
            const questionTagIds = q.tags.map(t => t.tagId)
            
            // Prüfe für jeden ursprünglich gewählten Tag, ob die Frage ihn oder seine Kinder hat
            return originalSelectedTags.every(selectedTagId => {
              // Wenn es ein Supertag ist, prüfe ob die Frage den Supertag oder eines seiner Kinder hat
              if (superTagIds.includes(selectedTagId)) {
                const superTagAndChildren = tagHierarchy[selectedTagId] || [selectedTagId]
                return superTagAndChildren.some(tagId => questionTagIds.includes(tagId))
              } else {
                // Normales Tag - prüfe direkt
                return questionTagIds.includes(selectedTagId)
              }
            })
          })
          .map(q => ({ id: q.id, caseId: q.caseId }))
      } else {
        // ODER-Logik: Finde Fragen mit mindestens einem Tag
        questions = await prisma.question.findMany({
          where: { 
            examId,
            OR: effectiveTagIds.map(tagId => ({
              tags: { some: { tagId } }
            }))
          },
          select: { id: true, caseId: true },
          orderBy: { id: "asc" }
        })
      }
      
      console.log("API Debug - Found questions:", { 
        questionsCount: questions.length, 
        questionIds: questions.map(q => q.id) 
      })
    }

    // Fälle zusammenhalten wenn gewünscht
    let questionIdSet = new Set(questions.map(q => q.id))
    
    if (includeCases) {
      const caseIds = Array.from(new Set(
        questions.map(q => q.caseId).filter(Boolean)
      )) as string[]
      
      if (caseIds.length > 0) {
        const caseQuestions = await prisma.question.findMany({
          where: { caseId: { in: caseIds } },
          select: { id: true }
        })
        caseQuestions.forEach(q => questionIdSet.add(q.id))
      }
    }

    questionIds = Array.from(questionIdSet)
    
    // Fragen shuffeln (aber Fälle zusammenhalten)
    if (includeCases) {
      // Gruppiere nach Fällen
      const caseGroups = new Map<string, string[]>()
      const standaloneQuestions: string[] = []
      
      // Hole alle Fragen mit ihren Case-IDs
      const questionsWithCases = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, caseId: true }
      })
      
      questionsWithCases.forEach(q => {
        if (q.caseId) {
          if (!caseGroups.has(q.caseId)) {
            caseGroups.set(q.caseId, [])
          }
          caseGroups.get(q.caseId)!.push(q.id)
        } else {
          standaloneQuestions.push(q.id)
        }
      })
      
      // Shuffle Fälle und standalone Fragen
      const shuffledCases = Array.from(caseGroups.values()).sort(() => Math.random() - 0.5)
      const shuffledStandalone = standaloneQuestions.sort(() => Math.random() - 0.5)
      
      // Kombiniere: erst Fälle, dann standalone
      questionIds = [...shuffledCases.flat(), ...shuffledStandalone]
    } else {
      // Einfaches Shuffling
      questionIds = questionIds.sort(() => Math.random() - 0.5)
    }
    
    // Limit anwenden
    if (typeof limit === "number" && limit > 0) {
      questionIds = questionIds.slice(0, limit)
    }

    if (questionIds.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: "Keine Fragen gefunden, die den gewählten Kriterien entsprechen" 
      }, { status: 400 })
    }
  }

  // Neu anlegen
  const attempt = await prisma.attempt.create({
    data: { 
      userId: me.id, 
      examId,
      // Speichere die gefilterten Fragen-IDs für späteren Gebrauch
      ...(questionIds.length > 0 && { 
        // Hier könnten wir die gefilterten IDs speichern, falls das Schema erweitert wird
      })
    },
    select: { id: true },
  })

  return NextResponse.json({ 
    ok: true, 
    attemptId: attempt.id,
    selectedCount: questionIds.length,
    totalAvailable: questionIds.length,
    filteredQuestionIds: questionIds // Sende die gefilterten IDs mit
  })
}