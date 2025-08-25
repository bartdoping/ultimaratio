import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import Link from "next/link"

type Props = { params: Promise<{ attemptId: string }> }

// hh:mm:ss bzw. mm:ss
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
  if (!session?.user?.id) redirect("/login")

  // Attempt + Antworten + Frage + Optionen (mit Erklärungen)
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: session.user.id as string },
    include: {
      exam: true,
      answers: {
        orderBy: { id: "asc" },
        include: {
          question: {
            select: {
              id: true,
              stem: true,
              explanation: true,
              options: {
                orderBy: { id: "asc" },
                select: { id: true, text: true, isCorrect: true, explanation: true },
              },
            },
          },
          answerOption: { select: { id: true, text: true } },
        },
      },
    },
  })

  if (!attempt) notFound()

  const correctCount = attempt.answers.filter((a) => a.isCorrect).length
  const total = attempt.answers.length
  const percent =
    attempt.scorePercent ?? (total > 0 ? Math.round((correctCount / total) * 100) : 0)

  // Dauer: bevorzugt persisted elapsedSec, sonst (finishedAt - startedAt)
  const durationMs =
    typeof (attempt as any).elapsedSec === "number"
      ? Math.max(0, ((attempt as any).elapsedSec as number) * 1000)
      : (attempt.finishedAt && attempt.startedAt
          ? attempt.finishedAt.getTime() - attempt.startedAt.getTime()
          : 0)

  return (
    <main className="container mx-auto max-w-3xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ergebnis: {attempt.exam.title}</h1>
        <Link href="/dashboard/history" className="btn btn-outline">Zurück</Link>
      </div>

      <div className="rounded border p-4 text-sm">
        <div>Richtig: <b>{correctCount} / {total}</b> ({percent}%)</div>
        <div>Dauer: <b>{formatDuration(durationMs)}</b></div>
        {typeof attempt.passed === "boolean" && (
          <div>Bestanden: <b>{attempt.passed ? "Ja" : "Nein"}</b></div>
        )}
      </div>

      <div className="space-y-4">
        {attempt.answers.map((a, idx) => {
          const q = a.question
          const selectedId = a.answerOption?.id
          return (
            <details key={a.id} className="rounded border">
              <summary className="cursor-pointer select-none px-4 py-3 flex items-center justify-between">
                <span className="font-medium">Frage {idx + 1}: {q.stem}</span>
                <span className={a.isCorrect ? "text-green-600" : "text-red-600"}>
                  {a.isCorrect ? "✓ richtig" : "✗ falsch"}
                </span>
              </summary>

              <div className="px-4 pb-4 space-y-3">
                {/* Optionen mit Erklärungen */}
                <div className="space-y-2">
                  {q.options.map(o => {
                    const isSelected = o.id === selectedId
                    return (
                      <div
                        key={o.id}
                        className={`rounded border ${isSelected ? "border-blue-500 ring-1 ring-blue-500" : ""}`}
                      >
                        <div className="px-3 py-2 flex items-center justify-between">
                          <div>
                            {o.text}
                            {isSelected && (
                              <span className={`ml-2 text-xs ${o.isCorrect ? "text-green-600" : "text-red-600"}`}>
                                {o.isCorrect ? "✓ richtig" : "✗ falsch"}
                              </span>
                            )}
                            {!isSelected && o.isCorrect && (
                              <span className="ml-2 text-xs text-green-600">✓ korrekt</span>
                            )}
                          </div>
                        </div>
                        {o.explanation && (
                          <div className="px-3 pb-3 text-sm text-muted-foreground whitespace-pre-wrap">
                            {o.explanation}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Zusammenfassende Erklärung */}
                {q.explanation && (
                  <details className="rounded border bg-secondary/40">
                    <summary className="px-3 py-2 text-sm font-medium cursor-pointer">Erklärung</summary>
                    <div className="px-3 pb-3 text-sm text-muted-foreground whitespace-pre-wrap">
                      {q.explanation}
                    </div>
                  </details>
                )}
              </div>
            </details>
          )
        })}
      </div>
    </main>
  )
}