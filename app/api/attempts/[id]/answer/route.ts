// app/api/attempts/[id]/answer/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import authOptions from "@/auth"
import prisma from "@/lib/db"
import { z } from "zod"

export const runtime = "nodejs"
type Params = { params: { id: string } }

const Body = z.object({
  questionId: z.string().min(1),
  answerOptionId: z.string().min(1),
  reveal: z.boolean().optional(), // Sofort-Feedback
})

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = Body.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 })
  const { questionId, answerOptionId, reveal } = parsed.data

  const attempt = await prisma.attempt.findUnique({
    where: { id: params.id },
    include: { exam: true },
  })
  if (!attempt) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })

  const me = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!me || (attempt.userId !== me.id && (session.user as any).role !== "admin"))
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })

  const option = await prisma.answerOption.findUnique({ where: { id: answerOptionId } })
  if (!option || option.questionId !== questionId)
    return NextResponse.json({ ok: false, error: "Invalid option" }, { status: 400 })

  const isCorrect = option.isCorrect

  await prisma.attemptAnswer.upsert({
    where: { attemptId_questionId: { attemptId: attempt.id, questionId } },
    update: { answerOptionId, isCorrect },
    create: { attemptId: attempt.id, questionId, answerOptionId, isCorrect },
  })

  // Sofort-Feedback nur, wenn erlaubt (global oder pro Frage)
  let allowed = attempt.exam.allowImmediateFeedback
  if (!allowed) {
    const q = await prisma.question.findUnique({ where: { id: questionId } })
    allowed = !!q?.hasImmediateFeedbackAllowed
  }

  return NextResponse.json({ ok: true, ...(reveal && allowed ? { isCorrect } : {}) })
}
