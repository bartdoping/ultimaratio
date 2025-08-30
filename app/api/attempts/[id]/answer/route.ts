// app/api/attempts/[id]/answer/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

const BodySchema = z.object({
  questionId: z.string().min(1),
  answerOptionId: z.string().min(1),
})

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> } // Next 15: params müssen awaited werden
) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const { id } = await context.params
    const attemptId = id

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 })
    const { questionId, answerOptionId } = parsed.data

    // Versuch prüfen
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: { id: true, userId: true, examId: true, finishedAt: true },
    })
    if (!attempt || attempt.userId !== userId) {
      return NextResponse.json({ error: "attempt not found" }, { status: 404 })
    }
    if (attempt.finishedAt) {
      return NextResponse.json({ error: "attempt finished" }, { status: 400 })
    }

    // Option + Frage validieren (muss zu diesem Exam gehören)
    const opt = await prisma.answerOption.findUnique({
      where: { id: answerOptionId },
      select: {
        id: true,
        isCorrect: true,
        questionId: true,
        question: { select: { examId: true } },
      },
    })
    if (!opt) return NextResponse.json({ error: "answer option not found" }, { status: 404 })
    if (opt.questionId !== questionId) {
      return NextResponse.json({ error: "option does not belong to question" }, { status: 400 })
    }
    if (opt.question.examId !== attempt.examId) {
      return NextResponse.json({ error: "question does not belong to this exam" }, { status: 400 })
    }

    await prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      update: { answerOptionId, isCorrect: opt.isCorrect },
      create: { attemptId, questionId, answerOptionId, isCorrect: opt.isCorrect },
    })

    return NextResponse.json({ ok: true, isCorrect: opt.isCorrect })
  } catch (e) {
    console.error("save answer failed:", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}