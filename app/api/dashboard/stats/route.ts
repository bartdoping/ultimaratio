import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Score-Statistiken: Richtig/Falsch/Offen
    const scoreStats = await prisma.$queryRaw<Array<{
      status: string
      count: bigint
    }>>`
      SELECT 
        CASE 
          WHEN aa."answerOptionId" IS NULL THEN 'unanswered'
          WHEN aa."isCorrect" = true THEN 'correct'
          ELSE 'incorrect'
        END as status,
        COUNT(*) as count
      FROM "Attempt" att
      JOIN "Question" q ON q."examId" = att."examId"
      LEFT JOIN "AttemptAnswer" aa ON aa."attemptId" = att.id AND aa."questionId" = q.id
      WHERE att."userId" = ${user.id}
      GROUP BY status
    `

    // Fragenbank-Statistiken: Genutzt/Ungenutzt (nur tatsächlich beantwortete Fragen)
    const questionBankStats = await prisma.$queryRaw<Array<{
      status: string
      count: bigint
    }>>`
      SELECT 
        CASE 
          WHEN aa."questionId" IS NOT NULL THEN 'used'
          ELSE 'unused'
        END as status,
        COUNT(DISTINCT q.id) as count
      FROM "Question" q
      JOIN "Exam" e ON e.id = q."examId"
      LEFT JOIN "Attempt" att ON att."examId" = e.id AND att."userId" = ${user.id}
      LEFT JOIN "AttemptAnswer" aa ON aa."attemptId" = att.id AND aa."questionId" = q.id
      WHERE e."isPublished" = true
      GROUP BY status
    `

    // Test-Statistiken: Erstellt/Beendet/Nicht beendet
    const testStats = await prisma.attempt.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        finishedAt: true
      }
    })

    // Gesamtanzahl verfügbarer Fragen
    const totalQuestions = await prisma.question.count({
      where: {
        exam: {
          isPublished: true
        }
      }
    })

    // Verarbeitung der Score-Statistiken
    const correctCount = Number(scoreStats.find(s => s.status === 'correct')?.count || 0)
    const incorrectCount = Number(scoreStats.find(s => s.status === 'incorrect')?.count || 0)
    const unansweredCount = Number(scoreStats.find(s => s.status === 'unanswered')?.count || 0)
    const totalAnswered = correctCount + incorrectCount + unansweredCount

    // Verarbeitung der Fragenbank-Statistiken
    const usedQuestions = Number(questionBankStats.find(s => s.status === 'used')?.count || 0)
    const unusedQuestions = totalQuestions - usedQuestions

    // Verarbeitung der Test-Statistiken
    const totalTests = testStats.length
    const finishedTests = testStats.filter(t => t.finishedAt).length
    const unfinishedTests = totalTests - finishedTests

    // Berechnung der Prozentsätze
    const scorePercentage = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0
    const usedPercentage = totalQuestions > 0 ? Math.round((usedQuestions / totalQuestions) * 100) : 0

    return NextResponse.json({
      score: {
        percentage: scorePercentage,
        correct: correctCount,
        incorrect: incorrectCount,
        unanswered: unansweredCount,
        total: totalAnswered
      },
      questionBank: {
        percentage: usedPercentage,
        used: usedQuestions,
        unused: unusedQuestions,
        total: totalQuestions
      },
      tests: {
        total: totalTests,
        finished: finishedTests,
        unfinished: unfinishedTests
      }
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
