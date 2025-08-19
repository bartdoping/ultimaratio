import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export const runtime = "nodejs"

export async function GET(
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
    include: { exam: { select: { id: true, title: true } } },
  })
  if (!attempt || attempt.userId !== (session.user as any).id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const questions = await prisma.question.findMany({
    where: { examId: attempt.examId },
    orderBy: { id: "asc" },
    include: {
      options: { select: { id: true, text: true } },
      media: { include: { media: true } },
    },
  })

  return NextResponse.json({
    attempt: { id: attempt.id, examId: attempt.examId, examTitle: attempt.exam.title },
    questions,
  })
}
