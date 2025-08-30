// app/api/attempts/[id]/answer/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> | { id: string } }

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id: attemptId } =
      "then" in (ctx.params as any)
        ? await (ctx.params as Promise<{ id: string }>)
        : (ctx.params as { id: string })

    if (!attemptId) return NextResponse.json({ error: "missing attempt id" }, { status: 400 })
    if (attemptId.startsWith("practice:")) return NextResponse.json({ ok: true, skipped: true })

    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const questionId: string | undefined = body?.questionId
    const answerOptionId: string | undefined = body?.answerOptionId
    if (!questionId || !answerOptionId) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 })
    }

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

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, examId: true },
    })
    if (!question) return NextResponse.json({ error: "question not found" }, { status: 404 })
    if (question.examId !== attempt.examId) {
      return NextResponse.json({ error: "question not in attempt exam" }, { status: 400 })
    }

    const option = await prisma.answerOption.findFirst({
      where: { id: answerOptionId, questionId },
      select: { id: true, isCorrect: true },
    })
    if (!option) return NextResponse.json({ error: "invalid answer option" }, { status: 400 })

    // Antwort speichern
    await prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: { attemptId, questionId, answerOptionId, isCorrect: option.isCorrect },
      update: { answerOptionId, isCorrect: option.isCorrect },
    })

    // Lernstatistik (wie gehabt)
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

    // NEU: bei falscher Antwort → Auto-Deck "Falsch beantwortet"
    if (!option.isCorrect) {
      await prisma.$transaction(async (tx) => {
        const auto = await tx.deck.findFirst({
          where: { userId, isAuto: true, autoType: "WRONG" as any },
          select: { id: true },
        })
        const deckId =
          auto?.id ??
          (await tx.deck.create({
            data: { userId, title: "Falsch beantwortet", isAuto: true, autoType: "WRONG" as any },
            select: { id: true },
          })).id

        const agg = await tx.deckItem.aggregate({ where: { deckId }, _max: { order: true } })
        const nextOrder = (agg._max.order ?? 0) + 1
        await tx.deckItem.upsert({
          where: { deckId_questionId: { deckId, questionId } },
          update: {},
          create: { deckId, questionId, order: nextOrder },
        })
      })
    }

    return NextResponse.json({ ok: true, isCorrect: option.isCorrect })
  } catch (e) {
    console.error("attempt answer failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}