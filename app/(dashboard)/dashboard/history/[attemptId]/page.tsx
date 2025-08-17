// app/(dashboard)/history/[attemptId]/page.tsx
import { getServerSession } from "next-auth"
import authOptions from "@/auth"
import prisma from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { DeleteAttemptButton } from "@/components/history-actions"
import { Button } from "@/components/ui/button"

type Props = { params: Promise<{ attemptId: string }> }

export default async function AttemptDetailPage({ params }: Props) {
  const { attemptId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect(`/login?next=/dashboard/history/${attemptId}`)

  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true,
      answers: {
        include: {
          answerOption: { select: { text: true, isCorrect: true, questionId: true } },
          question: { select: { stem: true, explanation: true, id: true } },
        },
        orderBy: { questionId: "asc" },
      },
    },
  })

  if (!attempt || attempt.userId !== me?.id) notFound()

  const total = await prisma.question.count({ where: { examId: attempt.examId } })
  const correct = attempt.answers.filter(a => a.isCorrect).length
  const score = attempt.scorePercent ?? Math.round((correct / (total || 1)) * 100)
  const passed = attempt.passed ?? score >= attempt.exam.passPercent

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Attempt-Details</h1>
          <p className="text-muted-foreground">
            {attempt.exam.title} · {new Date(attempt.startedAt).toLocaleString("de-DE")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/dashboard/history">Zurück</Link></Button>
          <DeleteAttemptButton attemptId={attemptId} />
        </div>
      </div>

      <div className="rounded border p-3">
        <p><strong>Score:</strong> {score}% – {passed ? "Bestanden ✅" : "Nicht bestanden ❌"} (Schwelle {attempt.exam.passPercent}%)</p>
        <p><strong>Korrekt:</strong> {correct} von {total}</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Fragen & Erklärungen</h2>
        <ol className="space-y-3 list-decimal pl-5">
          {attempt.answers.map((a, i) => (
            <li key={a.question.id}>
              <div className="font-medium">{a.question.stem}</div>
              <div className={a.isCorrect ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
                {a.isCorrect ? "Richtig" : "Falsch"} · Deine Antwort: „{a.answerOption.text}”
              </div>
              {a.question.explanation && (
                <div className="text-sm text-muted-foreground mt-1">{a.question.explanation}</div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
