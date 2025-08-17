// app/api/attempts/[id]/finish/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import authOptions from "@/auth"
import prisma from "@/lib/db"
import { computeScore } from "@/lib/scoring"
import { assertSameOrigin } from "@/lib/security"

export const runtime = "nodejs"
type Params = { params: { id: string } }

export async function POST(req: Request, { params }: Params) {
    assertSameOrigin(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const attempt = await prisma.attempt.findUnique({
    where: { id: params.id },
    include: { exam: true, answers: true },
  })
  if (!attempt) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })

  const me = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!me || (attempt.userId !== me.id && (session.user as any).role !== "admin"))
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })

  const total = await prisma.question.count({ where: { examId: attempt.examId } })
  const correct = attempt.answers.filter((a) => a.isCorrect).length
  const { scorePercent, passed } = computeScore(total, correct, attempt.exam.passPercent)

  const updated = await prisma.attempt.update({
    where: { id: attempt.id },
    data: { finishedAt: new Date(), scorePercent, passed },
    select: { id: true, finishedAt: true, scorePercent: true, passed: true },
  })

  return NextResponse.json({ ok: true, result: { total, correct, ...updated } })
}
