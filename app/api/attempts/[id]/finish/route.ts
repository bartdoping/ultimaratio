import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export const runtime = "nodejs"

export async function POST(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const attemptId = ctx.params.id

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { exam: { select: { passPercent: true, title: true } } },
  })
  if (!attempt || attempt.userId !== (session.user as any).id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const total = await prisma.question.count({ where: { examId: attempt.examId } })
  const correct = await prisma.attemptAnswer.count({ where: { attemptId, isCorrect: true } })
  const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0
  const passed = scorePercent >= attempt.exam.passPercent

  await prisma.attempt.update({
    where: { id: attemptId },
    data: { finishedAt: new Date(), scorePercent, passed },
  })

  return NextResponse.json({ ok: true, scorePercent, passed })
}
