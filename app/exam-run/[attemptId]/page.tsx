// app/exam-run/[attemptId]/page.tsx
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import { RunnerClient } from "@/components/runner-client"

type Props = { params: Promise<{ attemptId: string }> }

export const dynamic = "force-dynamic"

export default async function ExamRunPage({ params }: Props) {
  const { attemptId } = await params

  // Session & User
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    redirect("/login")
  }
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) redirect("/login")

  // Attempt laden (Ownership prüfen)
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { id: true, userId: true, examId: true },
  })
  if (!attempt || attempt.userId !== me.id) notFound()

  // Exam + Fragen + Optionen (+Erklärung) + MEDIA + CASE laden
  const exam = await prisma.exam.findUnique({
    where: { id: attempt.examId },
    select: {
      id: true,
      passPercent: true,
      allowImmediateFeedback: true,
      questions: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          stem: true,
          tip: true,             // Oberarztkommentar
          explanation: true,     // zusammenfassende Erläuterung
          options: {
            orderBy: { id: "asc" },
            select: { id: true, text: true, isCorrect: true, explanation: true },
          },
          media: {
            orderBy: { order: "asc" },
            include: { media: true },
          },
          case: {
            select: { id: true, title: true, vignette: true, order: true },
          },
        },
      },
    },
  })
  if (!exam) notFound()

  // Bereits gegebene Antworten laden
  const given = await prisma.attemptAnswer.findMany({
    where: { attemptId: attempt.id },
    select: { questionId: true, answerOptionId: true },
  })
  const initialAnswers = Object.fromEntries(
    given.map((g) => [g.questionId, g.answerOptionId] as const)
  )

  // In Client-Shape mappen
  const questions = exam.questions.map((q) => ({
    id: q.id,
    stem: q.stem,
    tip: q.tip ?? null,
    explanation: q.explanation ?? null,
    options: q.options.map((o) => ({
      id: o.id,
      text: o.text,
      isCorrect: o.isCorrect,
      explanation: o.explanation ?? null,
    })),
    media:
      q.media?.map((m) => ({
        id: m.media.id,
        url: m.media.url,
        alt: m.media.alt ?? "",
        order: (m as any).order ?? 0,
      })) ?? [],
    caseId: q.case?.id ?? null,
    caseTitle: q.case?.title ?? null,
    caseVignette: q.case?.vignette ?? null,
    caseOrder: q.case?.order ?? null,
  }))

  return (
    <div className="max-w-5xl mx-auto">
      <RunnerClient
        attemptId={attempt.id}
        examId={exam.id}
        passPercent={exam.passPercent}
        allowImmediateFeedback={exam.allowImmediateFeedback}
        questions={questions}
        initialAnswers={initialAnswers}
      />
    </div>
  )
}