// app/exam-run/[attemptId]/page.tsx
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import FilteredExamRunner from "@/components/filtered-exam-runner"
import { ExamProtection } from "@/components/exam-protection"

type Props = { params: Promise<{ attemptId: string }> }

export const dynamic = "force-dynamic"

export default async function ExamRunPage({ params }: Props) {
  const { attemptId } = await params

  // Session & User
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!me) redirect("/login")

  // Attempt (Ownership) + bisherige Zeit
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { id: true, userId: true, examId: true, elapsedSec: true, finishedAt: true },
  })
  if (!attempt || attempt.userId !== me.id) notFound()
  if (attempt.finishedAt) {
    // Bereits beendet → Ergebnis anzeigen
    redirect(`/dashboard/history/${attempt.id}`)
  }

  // Exam + Fragen + Optionen + MEDIA + CASE
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
          tip: true,
          explanation: true,
          options: {
            orderBy: { id: "asc" },
            select: { id: true, text: true, isCorrect: true, explanation: true },
          },
          media: { orderBy: { order: "asc" }, include: { media: true } },
          case: { select: { id: true, title: true, vignette: true, order: true } },
        },
      },
    },
  })
  if (!exam) notFound()

  // Gegebene Antworten
  const given = await prisma.attemptAnswer.findMany({
    where: { attemptId: attempt.id },
    select: { questionId: true, answerOptionId: true },
  })
  const initialAnswers = Object.fromEntries(
    given.map((g) => [g.questionId, g.answerOptionId] as const)
  )

  // Client-Shape
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
    <ExamProtection examMode={true}>
      <div className="w-full">
        <FilteredExamRunner
          attemptId={attempt.id}
          examId={exam.id}
          passPercent={exam.passPercent}
          allowImmediateFeedback={exam.allowImmediateFeedback}
          allQuestions={questions}
          initialAnswers={initialAnswers}
          initialElapsedSec={attempt.elapsedSec ?? 0}  // Fortsetzen ohne Zeitverlust
        />
      </div>
    </ExamProtection>
  )
}