// app/api/attempts/[id]/finish/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const attempt = await prisma.attempt.findFirst({
    where: { id, userId: me.id, finishedAt: null },
    include: {
      exam: { select: { id: true, passPercent: true } },
      answers: true,
    },
  })
  if (!attempt) return NextResponse.json({ error: "attempt not found or already finished" }, { status: 404 })

  const total = await prisma.question.count({ where: { examId: attempt.exam.id } })
  const correct = attempt.answers.filter(a => a.isCorrect).length
  const scorePercent = total === 0 ? 0 : Math.round((correct / total) * 100)
  const passed = scorePercent >= attempt.exam.passPercent

  await prisma.attempt.update({
    where: { id: attempt.id },
    data: { finishedAt: new Date(), scorePercent, passed },
  })

  return NextResponse.json({ ok: true, scorePercent, passed })
}