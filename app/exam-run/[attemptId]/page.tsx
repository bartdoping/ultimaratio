// app/exam-run/[attemptId]/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { RunnerClient } from "@/components/runner-client"

export const runtime = "nodejs"

type Params = { params: Promise<{ attemptId: string }> }

export default async function ExamRunPage({ params }: Params) {
  const { attemptId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) redirect("/login")

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: me.id },
    include: {
      exam: {
        select: { id: true, title: true, passPercent: true, allowImmediateFeedback: true },
      },
      answers: { select: { questionId: true, answerOptionId: true } },
    },
  })
  if (!attempt) notFound()

  // komplette Frageliste laden
  const questions = await prisma.question.findMany({
    where: { examId: attempt.examId },
    orderBy: { id: "asc" }, // ggf. Section/Order falls vorhanden
    select: {
      id: true,
      stem: true,
      options: { select: { id: true, text: true, isCorrect: true }, orderBy: { id: "asc" } },
    },
  })

  const initialAnswers = Object.fromEntries(
    attempt.answers.map(a => [a.questionId, a.answerOptionId])
  )

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">{attempt.exam.title}</h1>
      <RunnerClient
        attemptId={attempt.id}
        examId={attempt.exam.id}
        passPercent={attempt.exam.passPercent}
        allowImmediateFeedback={attempt.exam.allowImmediateFeedback}
        questions={questions}
        initialAnswers={initialAnswers}
      />
    </div>
  )
}