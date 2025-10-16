// app/api/attempts/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { shuffleArray } from "@/lib/shuffle"

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
    select: { id: true, subscriptionStatus: true },
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

  // Abo-Status prüfen (Pro-User haben Zugang zu allen Prüfungen)
  if (me.subscriptionStatus !== "pro") {
    return NextResponse.json({ 
      ok: false, 
      error: "subscription_required",
      message: "Pro-Abonnement erforderlich. Upgrade zu Pro für unbegrenzten Zugang zu allen Prüfungen!"
    }, { status: 403 })
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
      
      // Hole alle Fragen mit ihren Case-IDs und caseOrder
      const questionsWithCases = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, caseId: true, caseOrder: true }
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
      
      // Shuffle Fälle und standalone Fragen mit Fisher-Yates
      const shuffledCases = shuffleArray(Array.from(caseGroups.values()))
      const shuffledStandalone = shuffleArray(standaloneQuestions)
      
      // Sortiere Fragen innerhalb jedes Falls nach caseOrder (NICHT shuffeln!)
      const sortedCaseQuestions = shuffledCases.map(caseQuestions => {
        return caseQuestions.sort((a, b) => {
          const questionA = questionsWithCases.find(q => q.id === a)
          const questionB = questionsWithCases.find(q => q.id === b)
          const orderA = questionA?.caseOrder ?? 0
          const orderB = questionB?.caseOrder ?? 0
          return orderA - orderB
        })
      })
      
      // Kombiniere: erst Fälle (mit sortierten Fragen), dann standalone
      questionIds = [...sortedCaseQuestions.flat(), ...shuffledStandalone]
      
      console.log("API Debug - Shuffled with cases:", {
        originalCount: questions.length,
        caseGroups: caseGroups.size,
        standaloneCount: standaloneQuestions.length,
        finalCount: questionIds.length,
        firstFive: questionIds.slice(0, 5),
        caseDetails: Array.from(caseGroups.entries()).map(([caseId, questionIds]) => ({
          caseId,
          questionCount: questionIds.length,
          questionIds: questionIds.slice(0, 3) // Erste 3 Fragen des Falls
        }))
      })
    } else {
      // Einfaches Shuffling mit Fisher-Yates
      questionIds = shuffleArray(questionIds)
      
      console.log("API Debug - Shuffled without cases:", {
        originalCount: questions.length,
        finalCount: questionIds.length,
        firstFive: questionIds.slice(0, 5)
      })
    }
    
    // Limit anwenden - Fallfragen können enthalten sein, müssen aber nicht
    if (typeof limit === "number" && limit > 0) {
      if (includeCases) {
        // Bei Fallfragen: Versuche komplette Fallfragen-Blöcke zu verwenden, aber fülle mit Einzelfragen auf
        const limitedQuestionIds: string[] = []
        let currentCount = 0
        const usedCaseIds = new Set<string>()
        
        // Hole alle Fragen mit ihren Case-IDs für die Limit-Logik
        const questionsWithCases = await prisma.question.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, caseId: true }
        })
        
        const questionToCaseMap = new Map(
          questionsWithCases.map(q => [q.id, q.caseId])
        )
        
        // Erst: Versuche komplette Fallfragen-Blöcke hinzuzufügen
        for (const questionId of questionIds) {
          const caseId = questionToCaseMap.get(questionId)
          
          if (caseId && !usedCaseIds.has(caseId)) {
            // Fallfrage: Prüfe, ob der komplette Fall noch in das Limit passt
            const caseQuestions = questionsWithCases.filter(q => q.caseId === caseId)
            const caseSize = caseQuestions.length
            
            if (currentCount + caseSize <= limit) {
              // Kompletter Fall passt noch rein
              limitedQuestionIds.push(...caseQuestions.map(q => q.id))
              currentCount += caseSize
              usedCaseIds.add(caseId)
            }
            // Wenn Fall nicht passt, überspringe ihn komplett
          }
        }
        
        // Dann: Fülle mit Einzelfragen auf (auch aus nicht verwendeten Fällen)
        for (const questionId of questionIds) {
          if (currentCount >= limit) break
          
          const caseId = questionToCaseMap.get(questionId)
          
          if (!caseId || usedCaseIds.has(caseId)) {
            // Standalone-Frage oder bereits verwendeter Fall
            if (!limitedQuestionIds.includes(questionId)) {
              limitedQuestionIds.push(questionId)
              currentCount++
            }
          }
        }
        
        questionIds = limitedQuestionIds
      } else {
        // Ohne Fallfragen: Einfaches Limit
        questionIds = questionIds.slice(0, limit)
      }
    }

    if (questionIds.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: "Keine Fragen gefunden, die den gewählten Kriterien entsprechen" 
      }, { status: 400 })
    }
  } else {
    // Keine Tags ausgewählt - alle Fragen der Prüfung verwenden
    console.log("API Debug - No tags selected, using all questions")
    
    const allQuestions = await prisma.question.findMany({
      where: { examId },
      select: { id: true, caseId: true, caseOrder: true }
    })
    
    questionIds = allQuestions.map(q => q.id)
    
    // Shuffle alle Fragen
    if (includeCases) {
      // Gruppiere nach Fällen
      const caseGroups = new Map<string, string[]>()
      const standaloneQuestions: string[] = []
      
      allQuestions.forEach(q => {
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
      const shuffledCases = shuffleArray(Array.from(caseGroups.values()))
      const shuffledStandalone = shuffleArray(standaloneQuestions)
      
      // Sortiere Fragen innerhalb jedes Falls nach caseOrder
      const sortedCaseQuestions = shuffledCases.map(caseQuestions => {
        return caseQuestions.sort((a, b) => {
          const questionA = allQuestions.find(q => q.id === a)
          const questionB = allQuestions.find(q => q.id === b)
          const orderA = questionA?.caseOrder ?? 0
          const orderB = questionB?.caseOrder ?? 0
          return orderA - orderB
        })
      })
      
      questionIds = [...sortedCaseQuestions.flat(), ...shuffledStandalone]
    } else {
      // Einfaches Shuffling
      questionIds = shuffleArray(questionIds)
    }
    
    // Limit anwenden
    if (typeof limit === "number" && limit > 0) {
      questionIds = questionIds.slice(0, limit)
    }
    
    console.log("API Debug - All questions shuffled:", {
      totalQuestions: allQuestions.length,
      finalCount: questionIds.length,
      firstFive: questionIds.slice(0, 5)
    })
  }

  // Neu anlegen
  const attempt = await prisma.attempt.create({
    data: { 
      userId: me.id, 
      examId
    },
    select: { id: true },
  })

  return NextResponse.json({ 
    ok: true, 
    attemptId: attempt.id,
    selectedCount: questionIds.length,
    totalAvailable: questionIds.length,
    filteredQuestionIds: questionIds // Sende die gefilterten und geshuffelten IDs zurück
  })
}