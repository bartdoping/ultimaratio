import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

type Body = { questionId?: string; answerOptionId?: string }

export async function POST(
  req: Request,
  { params }: { params: { id: string } } // ✅ korrekte RouteContext-Signatur
) {
  try {
    const attemptId = params.id
    if (!attemptId) {
      return NextResponse.json({ error: "missing attempt id" }, { status: 400 })
    }

    // Falls versehentlich Practice-Attempt hier landet: noop (defensiv)
    if (attemptId.startsWith("practice:")) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Auth
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    // Body
    const { questionId, answerOptionId } = (await req.json().catch(() => ({}))) as Body
    if (!questionId || !answerOptionId) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 })
    }

    // Attempt prüfen
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: { id: true, userId: true, examId: true, finishedAt: true },
    })
    if (!attempt || attempt.userId !== userId) {
      return NextResponse.json({ error: "attempt not found" }, { status: 404 })
    }
    if (attempt.finishedAt) {
      return NextResponse.json({ error: "attempt already finished" }, { status: 400 })
    }

    // Frage & Option validieren
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, examId: true },
    })
    if (!question) {
      return NextResponse.json({ error: "question not found" }, { status: 404 })
    }
    if (question.examId !== attempt.examId) {
      return NextResponse.json({ error: "question not in attempt exam" }, { status: 400 })
    }

    // Achtung: Dein Model heißt offenbar "AnswerOption" -> Client-API "answerOption"
    const option = await prisma.answerOption.findFirst({
      where: { id: answerOptionId, questionId },
      select: { id: true, isCorrect: true },
    })
    if (!option) {
      return NextResponse.json({ error: "invalid answer option" }, { status: 400 })
    }

    // Antwort speichern (Upsert pro Frage) – isCorrect MUSS gesetzt werden
    await prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: { attemptId, questionId, answerOptionId, isCorrect: option.isCorrect },
      update: { answerOptionId, isCorrect: option.isCorrect },
    })

    // (Optional) Lernstatistik aktualisieren
    const now = new Date()
    const currentStat = await prisma.userQuestionStat.findUnique({
      where: { userId_questionId: { userId, questionId } },
      select: { userId: true, questionId: true },
    })

    if (!currentStat) {
      await prisma.userQuestionStat.create({
        data: {
          userId,
          questionId,
          seenCount: 1,
          wrongCount: option.isCorrect ? 0 : 1,
          lastCorrectAt: option.isCorrect ? now : null,
          lastWrongAt: option.isCorrect ? null : now,
        },
      })
    } else {
      await prisma.userQuestionStat.update({
        where: { userId_questionId: { userId, questionId } },
        data: option.isCorrect
          ? { seenCount: { increment: 1 }, lastCorrectAt: now }
          : { seenCount: { increment: 1 }, wrongCount: { increment: 1 }, lastWrongAt: now },
      })
    }

    return NextResponse.json({ ok: true, isCorrect: option.isCorrect })
  } catch (e) {
    console.error("attempt answer failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}