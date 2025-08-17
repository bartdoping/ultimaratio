// app/api/attempts/[id]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import authOptions from "@/auth"
import prisma from "@/lib/db"

export const runtime = "nodejs"

type Params = { params: { id: string } }

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const attempt = await prisma.attempt.findUnique({
    where: { id: params.id },
    include: {
      exam: { select: { id: true, title: true, passPercent: true, allowImmediateFeedback: true } },
      answers: true,
    },
  })
  if (!attempt) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })

  // Ownership
  const me = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!me || (attempt.userId !== me.id && (session.user as any).role !== "admin"))
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })

  // Fragen + Optionen + Medien
  const questions = await prisma.question.findMany({
    where: { examId: attempt.examId },
    orderBy: [{ sectionId: "asc" }, { id: "asc" }],
    include: {
      options: { orderBy: { id: "asc" } },
      media: { include: { media: true }, orderBy: { order: "asc" } },
    },
  })

  return NextResponse.json({
    ok: true,
    attempt: {
      id: attempt.id,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      scorePercent: attempt.scorePercent,
      passed: attempt.passed,
    },
    exam: attempt.exam,
    questions: questions.map((q) => ({
      id: q.id,
      stem: q.stem,
      explanation: q.explanation,
      hasImmediateFeedbackAllowed: q.hasImmediateFeedbackAllowed,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      images: q.media.map((m) => ({ url: m.media.url, alt: m.media.alt ?? "" })),
    })),
    answers: attempt.answers.map((a) => ({ questionId: a.questionId, answerOptionId: a.answerOptionId, isCorrect: a.isCorrect })),
  })
}
