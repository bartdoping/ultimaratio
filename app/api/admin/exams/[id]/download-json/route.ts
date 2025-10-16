import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Prüfe Admin-Status
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

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
            title: true,
            vignette: true,
            order: true
          }
        }
      }
    })

    // JSON-Format erstellen
    const jsonData = {
      cases: questions
        .filter(q => q.case)
        .map(q => ({
          title: q.case!.title,
          vignette: q.case!.vignette,
          order: q.case!.order
        }))
        .filter((case_, index, arr) => 
          arr.findIndex(c => c.title === case_.title) === index
        ), // Duplikate entfernen
      questions: questions.map(q => ({
        stem: q.stem,
        tip: q.tip,
        explanation: q.explanation,
        allowImmediate: q.hasImmediateFeedbackAllowed,
        caseTitle: q.case?.title || undefined,
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
