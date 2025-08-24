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

  // Attempt laden (und Ownership prüfen)
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { id: true, userId: true, examId: true },
  })
  if (!attempt || attempt.userId !== me.id) notFound()

  // Exam + Fragen + Optionen + MEDIA laden
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
          // Optionen (für Sofort-Feedback istCorrect nötig – Anzeige steuert der Client via allowImmediateFeedback)
          options: {
            orderBy: { id: "asc" },
            select: { id: true, text: true, isCorrect: true },
          },
          // WICHTIG: Media mitsenden
          media: {
            orderBy: { order: "asc" },
            include: { media: true }, // => { mediaId, order, media: { id, url, alt, ... } }
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

  // In Client-Shape mappen (v.a. Media flach ziehen)
  const questions = exam.questions.map((q) => ({
    id: q.id,
    stem: q.stem,
    options: q.options.map((o) => ({
      id: o.id,
      text: o.text,
      isCorrect: o.isCorrect,
    })),
    media:
      q.media?.map((m) => ({
        id: m.media.id,           // ID des MediaAssets
        url: m.media.url,         // Bild-URL
        alt: m.media.alt ?? "",   // Alt-Text
        order: m.order ?? 0,      // Reihenfolge
      })) ?? [],
  }))

  return (
    <div className="max-w-3xl mx-auto">
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