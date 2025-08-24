// app/(dashboard)/dashboard/history/[attemptId]/page.tsx
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"

type Props = { params: Promise<{ attemptId: string }> }

// hh:mm:ss bzw. mm:ss Format
function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default async function HistoryDetailPage({ params }: Props) {
  const { attemptId } = await params

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/login")
  }

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: session!.user!.id as string },
    include: {
      // Titel + Anzahl der Fragen für "X von Y richtig"
      exam: { select: { title: true, _count: { select: { questions: true } } } },
      // Antworten inkl. eigener Option + korrekter Option(en) der Frage
      answers: {
        orderBy: { id: "asc" },
        include: {
          answerOption: { select: { id: true, text: true } },
          question: {
            select: {
              stem: true,
              // wir brauchen die korrekten Optionen (auch wenn es aktuell Single-Choice ist)
              options: { where: { isCorrect: true }, select: { id: true, text: true } },
            },
          },
        },
      },
    },
  })

  if (!attempt) notFound()

  const totalQuestions = attempt.exam._count.questions
  const correct = attempt.answers.filter(a => a.isCorrect).length
  const percent =
    attempt.scorePercent ??
    (totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0)

  const durationMs =
    attempt.finishedAt && attempt.startedAt
      ? attempt.finishedAt.getTime() - attempt.startedAt.getTime()
      : 0

  return (
    <main className="container mx-auto max-w-3xl py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Ergebnis: {attempt.exam.title}</h1>
        <div className="text-sm text-muted-foreground">
          {/* X von Y richtig + Prozent */}
          <span>
            Richtig: <strong>{correct}</strong> von <strong>{totalQuestions}</strong>
            {totalQuestions > 0 ? ` (${percent}%)` : ""}
          </span>
          <span className="mx-2">•</span>
          {/* Dauer */}
          <span>Dauer: <strong>{formatDuration(durationMs)}</strong></span>
          {typeof attempt.passed === "boolean" && (
            <>
              <span className="mx-2">•</span>
              <span>Bestanden: <strong>{attempt.passed ? "Ja" : "Nein"}</strong></span>
            </>
          )}
        </div>
      </header>

      <section className="space-y-4">
        {attempt.answers.map((a) => {
          const correctTexts = (a.question.options ?? []).map(o => o.text).join(", ")
          return (
            <div key={a.id} className="rounded border p-4 space-y-2">
              <div className="font-medium">{a.question.stem}</div>

              <div>
                Deine Antwort: <span className="font-medium">{a.answerOption.text}</span>{" "}
                {a.isCorrect ? (
                  <span className="ml-2 inline-block text-green-600">✅ richtig</span>
                ) : (
                  <span className="ml-2 inline-block text-red-600">❌ falsch</span>
                )}
              </div>

              {!a.isCorrect && correctTexts && (
                <div className="text-sm text-muted-foreground">
                  Richtig wäre: <span className="font-medium text-foreground">{correctTexts}</span>
                </div>
              )}
            </div>
          )
        })}
      </section>
    </main>
  )
}