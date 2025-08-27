import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  // Auth
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // Body
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
  const { questionId, answerOptionId } = body ?? {}
  if (typeof questionId !== "string" || typeof answerOptionId !== "string") {
    return NextResponse.json({ error: "missing fields" }, { status: 400 })
  }

  // Attempt offen & Ownership
  const attempt = await prisma.attempt.findFirst({
    where: { id, userId: me.id, finishedAt: null },
    select: { id: true, examId: true },
  })
  if (!attempt) return NextResponse.json({ error: "attempt not found" }, { status: 404 })

  // Frage gehört zum Exam?
  const question = await prisma.question.findFirst({
    where: { id: questionId, examId: attempt.examId },
    select: { id: true },
  })
  if (!question) return NextResponse.json({ error: "question not in exam" }, { status: 400 })

  // Option gehört zur Frage?
  const option = await prisma.answerOption.findFirst({
    where: { id: answerOptionId, questionId },
    select: { isCorrect: true, questionId: true },
  })
  if (!option) return NextResponse.json({ error: "bad option" }, { status: 400 })

  // Antwort + Lernstatistik in einer TX
  await prisma.$transaction(async (tx) => {
    await tx.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId: attempt.id, questionId } },
      update: { answerOptionId, isCorrect: option.isCorrect },
      create: { attemptId: attempt.id, questionId, answerOptionId, isCorrect: option.isCorrect },
    })

    const now = new Date()
    const stat = await tx.userQuestionStat.findUnique({
      where: { userId_questionId: { userId: me.id, questionId } },
      select: { seenCount: true, wrongCount: true },
    })

    if (!stat) {
      await tx.userQuestionStat.create({
        data: {
          userId: me.id,
          questionId,
          seenCount: 1,
          wrongCount: option.isCorrect ? 0 : 1,
          lastCorrectAt: option.isCorrect ? now : null,
          lastWrongAt: option.isCorrect ? null : now,
        },
      })
    } else {
      await tx.userQuestionStat.update({
        where: { userId_questionId: { userId: me.id, questionId } },
        data: option.isCorrect
          ? { seenCount: { increment: 1 }, lastCorrectAt: now }
          : { seenCount: { increment: 1 }, wrongCount: { increment: 1 }, lastWrongAt: now },
      })
    }
  })

  return NextResponse.json({ ok: true })
}