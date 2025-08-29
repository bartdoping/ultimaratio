// app/api/attempts/[id]/answer/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

type Ctx =
  | { params: Promise<{ id: string }> }
  | { params: { id: string } }

export async function POST(req: Request, ctx: Ctx) {
  try {
    // params sicher auslesen (Promise oder Sync)
    const { id } =
      "then" in (ctx.params as any)
        ? await (ctx.params as Promise<{ id: string }>)
        : (ctx.params as { id: string })

    const attemptId = id
    if (!attemptId) {
      return NextResponse.json({ error: "missing attempt id" }, { status: 400 })
    }

    // Falls versehentlich Practice-Attempt hier landet: noop
    if (attemptId.startsWith("practice:")) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Auth
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id as string | undefined
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    // Body
    const body = await req.json().catch(() => ({} as any))
    const questionId: string | undefined = body?.questionId
    const answerOptionId: string | undefined = body?.answerOptionId
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

    const option = await prisma.answerOption.findFirst({
      where: { id: answerOptionId, questionId },
      select: { id: true, isCorrect: true },
    })
    if (!option) {
      return NextResponse.json({ error: "invalid answer option" }, { status: 400 })
    }

    // Antwort speichern (upsert pro Frage) – isCorrect mitgeben!
    await prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: { attemptId, questionId, answerOptionId, isCorrect: option.isCorrect },
      update: { answerOptionId, isCorrect: option.isCorrect },
    })

    // (Optional) Lernstatistik aktualisieren
    const now = new Date()
    const stat = await prisma.userQuestionStat.findUnique({
      where: { userId_questionId: { userId, questionId } },
      select: { userId: true, questionId: true },
    })
    if (!stat) {
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