import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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

export const dynamic = "force-dynamic"

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

  // Dauer: bevorzugt persisted elapsedSec (Sekunden), sonst (finishedAt - startedAt)
  const durationMs =
    typeof (attempt as any).elapsedSec === "number"
      ? Math.max(0, ((attempt as any).elapsedSec as number) * 1000)
      : (attempt.finishedAt && attempt.startedAt
          ? attempt.finishedAt.getTime() - attempt.startedAt.getTime()
          : 0)

  return (
    <main className="container mx-auto max-w-4xl py-8 space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ergebnis</div>
            <h1 className="text-2xl font-semibold tracking-tight">{attempt.exam.title}</h1>
            <p className="text-sm text-muted-foreground">Auswertung deines Prüfungsdurchlaufs.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/practice/${attempt.exam.id}`}>Diese Prüfung üben</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/history">Zurück</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Score</div>
          <div className="mt-1 text-2xl font-semibold">{percent}%</div>
          <div className="text-xs text-muted-foreground">{correctCount} von {total} richtig</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">Dauer</div>
          <div className="mt-1 text-2xl font-semibold">{formatDuration(durationMs)}</div>
        </div>
        {typeof attempt.passed === "boolean" && (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">Status</div>
            <div className={`mt-1 text-2xl font-semibold ${attempt.passed ? "text-green-600" : "text-red-600"}`}>
              {attempt.passed ? "Bestanden" : "Nicht bestanden"}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {attempt.answers.map((a, idx) => {
          const q = a.question
          const selectedId = a.answerOption?.id
          return (
            <details key={a.id} className="rounded-xl border bg-card shadow-sm">
              <summary className="cursor-pointer select-none px-4 py-3 flex items-center justify-between gap-4">
                <span className="font-medium">Frage {idx + 1}: {q.stem}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${a.isCorrect ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>
                  {a.isCorrect ? "richtig" : "falsch"}
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
                        className={`rounded-lg border ${isSelected ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500 dark:bg-blue-950/20" : "bg-muted/20"}`}
                      >
                        <div className="px-3 py-2 flex items-center justify-between">
                          <div>
                            {o.text}
                            {isSelected && (
                              <span className={`ml-2 text-xs ${o.isCorrect ? "text-green-600" : "text-red-600"}`}>
                                {o.isCorrect ? "richtig gewählt" : "falsch gewählt"}
                              </span>
                            )}
                            {!isSelected && o.isCorrect && (
                              <span className="ml-2 text-xs text-green-600">korrekt</span>
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
                  <details className="rounded-lg border bg-secondary/40">
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