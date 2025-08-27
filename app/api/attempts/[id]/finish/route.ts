import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const attemptId = params.id
    if (!attemptId) {
      return NextResponse.json({ ok: false, error: "Missing attempt id" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const Parsed = z.object({ elapsedSec: z.number().int().nonnegative().optional() }).safeParse(body)
    const elapsedFromClient = Parsed.success ? Parsed.data.elapsedSec : undefined

    // Nutzer ermitteln
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

    // Attempt + Ownership
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: { id: true, userId: true, examId: true, startedAt: true, finishedAt: true },
    })
    if (!attempt || attempt.userId !== me.id) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    }

    // Exam-Infos
    const exam = await prisma.exam.findUnique({
      where: { id: attempt.examId },
      select: { passPercent: true, _count: { select: { questions: true } } },
    })
    if (!exam) {
      return NextResponse.json({ ok: false, error: "Exam not found" }, { status: 404 })
    }

    // Antworten laden (für Score & Stats)
    const answers = await prisma.attemptAnswer.findMany({
      where: { attemptId },
      select: { questionId: true, isCorrect: true },
    })

    const correctCount = answers.filter(a => a.isCorrect).length
    const totalQuestions = exam._count.questions || 0
    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
    const passed = scorePercent >= exam.passPercent

    // Zeit ermitteln
    const derivedElapsed = Math.max(0, Math.round((Date.now() - attempt.startedAt.getTime()) / 1000))
    const finalElapsed = typeof elapsedFromClient === "number" ? elapsedFromClient : derivedElapsed

    // Attempt abschließen
    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        finishedAt: new Date(),
        scorePercent,
        passed,
        elapsedSec: finalElapsed,
      },
    })

    // UserQuestionStat updaten (Aggregation pro Frage)
    const now = new Date()
    const grouped = new Map<string, { seen: number; wrong: number; lastWrongAt?: Date; lastCorrectAt?: Date }>()
    for (const a of answers) {
      const g = grouped.get(a.questionId) || { seen: 0, wrong: 0 }
      g.seen += 1
      if (a.isCorrect) g.lastCorrectAt = now
      else { g.wrong += 1; g.lastWrongAt = now }
      grouped.set(a.questionId, g)
    }

    await prisma.$transaction(
      Array.from(grouped.entries()).map(([questionId, agg]) =>
        prisma.userQuestionStat.upsert({
          where: { userId_questionId: { userId: attempt.userId, questionId } },
          update: {
            seenCount: { increment: agg.seen },
            wrongCount: { increment: agg.wrong },
            ...(agg.lastWrongAt ? { lastWrongAt: agg.lastWrongAt } : {}),
            ...(agg.lastCorrectAt ? { lastCorrectAt: agg.lastCorrectAt } : {}),
          },
          create: {
            userId: attempt.userId,
            questionId,
            seenCount: agg.seen,
            wrongCount: agg.wrong,
            lastWrongAt: agg.lastWrongAt ?? null,
            lastCorrectAt: agg.lastCorrectAt ?? null,
          },
        })
      )
    )

    return NextResponse.json({ ok: true, scorePercent, passed, elapsedSec: finalElapsed })
  } catch (e) {
    console.error("finish attempt failed:", e)
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 })
  }
}