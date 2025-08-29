import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

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

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, examId: true },
  })
  if (!question) return NextResponse.json({ error: "question not found" }, { status: 404 })

  const purchase = await prisma.purchase.findFirst({
    where: { userId: me.id, examId: question.examId },
    select: { id: true },
  })
  if (!purchase) return NextResponse.json({ error: "no access to exam" }, { status: 403 })

  const option = await prisma.answerOption.findFirst({
    where: { id: answerOptionId, questionId },
    select: { isCorrect: true },
  })
  if (!option) return NextResponse.json({ error: "bad option" }, { status: 400 })

  const now = new Date()
  const stat = await prisma.userQuestionStat.findUnique({
    where: { userId_questionId: { userId: me.id, questionId } },
    select: { userId: true, questionId: true },
  })

  if (!stat) {
    await prisma.userQuestionStat.create({
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
    await prisma.userQuestionStat.update({
      where: { userId_questionId: { userId: me.id, questionId } },
      data: option.isCorrect
        ? { seenCount: { increment: 1 }, lastCorrectAt: now }
        : { seenCount: { increment: 1 }, wrongCount: { increment: 1 }, lastWrongAt: now },
    })
  }

  return NextResponse.json({ ok: true, isCorrect: option.isCorrect })
}