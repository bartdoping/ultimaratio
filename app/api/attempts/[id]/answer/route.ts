import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export const runtime = "nodejs"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const attemptId = params.id
  const { questionId, answerOptionId } = (await req.json()) as {
    questionId?: string
    answerOptionId?: string
  }

  if (!questionId || !answerOptionId) {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 })
  }

  // Attempt gehört dem eingeloggten User?
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { userId: true },
  })
  if (!attempt || attempt.userId !== (session.user as any).id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const opt = await prisma.answerOption.findUnique({
    where: { id: answerOptionId },
    select: { isCorrect: true, questionId: true },
  })
  if (!opt || opt.questionId !== questionId) {
    return NextResponse.json({ error: "option-mismatch" }, { status: 400 })
  }

  await prisma.attemptAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    update: { answerOptionId, isCorrect: opt.isCorrect },
    create: { attemptId, questionId, answerOptionId, isCorrect: opt.isCorrect },
  })

  return NextResponse.json({ ok: true })
}
