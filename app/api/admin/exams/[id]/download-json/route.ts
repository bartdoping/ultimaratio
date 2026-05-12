import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireAdminJson } from "@/lib/authz"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminJson()
    if (guard.response) return guard.response

    const { id: examId } = await params

    // Alle Fragen mit Optionen, Medien und Fällen laden
    const questions = await prisma.question.findMany({
      where: { examId },
      orderBy: { order: "asc" },
      include: {
        options: {
          orderBy: { order: "asc" },
          select: {
            text: true,
            isCorrect: true,
            explanation: true,
            order: true
          }
        },
        media: {
          orderBy: { order: "asc" },
          include: {
            media: {
              select: {
                url: true,
                alt: true
              }
            }
          }
        },
        case: {
          select: {
            vignette: true,
          }
        }
      }
    })

    const normalizedQuestions = questions.map(q => ({
      stem: q.stem,
      explanation: q.explanation,
      allowImmediate: q.hasImmediateFeedbackAllowed,
      caseVignette: q.case?.vignette || undefined,
      images: q.media.map(m => ({
        url: m.media.url,
        alt: m.media.alt
      })),
      options: q.options.map(o => ({
        text: o.text,
        isCorrect: o.isCorrect,
        explanation: o.explanation
      }))
    }))

    const jsonData = {
      schemaVersion: "1",
      questions: normalizedQuestions,
    }

    // Dateiname mit Exam-Titel
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { title: true }
    })
    const filename = `${exam?.title || 'exam'}_questions.json`
    
    // JSON als Datei zurückgeben
    const jsonString = JSON.stringify(jsonData, null, 2)
    
    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error("Download JSON error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
