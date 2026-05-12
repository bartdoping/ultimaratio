import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireAdminJson } from "@/lib/authz"

// Cache für Duplikat-Ergebnisse (5 Minuten)
const duplicatesCache = new Map<string, { data: any, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 Minuten

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminJson()
    if (guard.response) return guard.response

    const { id: examId } = await params

    // Prüfe Cache
    const cacheKey = `duplicates-${examId}`
    const cached = duplicatesCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data)
    }

    // Lade nur notwendige Daten für Duplikat-Erkennung
    const questions = await prisma.question.findMany({
      where: { examId },
      select: {
        id: true,
        stem: true,
        options: {
          select: {
            text: true,
            isCorrect: true
          },
          orderBy: { order: "asc" }
        }
      },
      orderBy: { order: "asc" }
    })

    // Erstelle Hash für jede Frage basierend auf Stem und Optionen
    const questionHashes = new Map<string, string[]>()
    
    questions.forEach(question => {
      const optionsText = question.options
        .map(opt => `${opt.text}:${opt.isCorrect}`)
        .sort()
        .join('|')
      
      const hash = `${question.stem.trim()}|${optionsText}`
      
      if (!questionHashes.has(hash)) {
        questionHashes.set(hash, [])
      }
      questionHashes.get(hash)!.push(question.id)
    })

    // Finde Duplikate (Hash mit mehr als einer Frage)
    const duplicates = new Map<string, string[]>()
    questionHashes.forEach((questionIds, hash) => {
      if (questionIds.length > 1) {
        duplicates.set(hash, questionIds)
      }
    })

    const result = { 
      duplicates: Object.fromEntries(duplicates),
      totalDuplicates: Array.from(duplicates.values()).flat().length
    }

    // Cache das Ergebnis
    duplicatesCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error("Get duplicates error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
