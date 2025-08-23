// app/api/attempts/[id]/answer/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }) }
  const { questionId, answerOptionId } = body ?? {}
  if (!questionId || !answerOptionId) return NextResponse.json({ error: "missing fields" }, { status: 400 })

  const attempt = await prisma.attempt.findFirst({
    where: { id, userId: me.id, finishedAt: null },
    select: { id: true, examId: true },
  })
  if (!attempt) return NextResponse.json({ error: "attempt not found" }, { status: 404 })

  const option = await prisma.answerOption.findFirst({
    where: { id: answerOptionId, questionId },
    select: { isCorrect: true, questionId: true },
  })
  if (!option) return NextResponse.json({ error: "bad option" }, { status: 400 })

  // upsert Antwort (unique (attemptId, questionId))
  await prisma.attemptAnswer.upsert({
    where: { attemptId_questionId: { attemptId: attempt.id, questionId } },
    update: { answerOptionId, isCorrect: option.isCorrect },
    create: { attemptId: attempt.id, questionId, answerOptionId, isCorrect: option.isCorrect },
  })

  return NextResponse.json({ ok: true })
}