import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"

type Props = {
  params: Promise<{ attemptId: string }>
  searchParams?: Promise<{ review?: string }>
}
type ReviewStatus = "correct" | "wrong" | "open"

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

function reviewBadgeClass(status: ReviewStatus) {
  if (status === "correct") return "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
  if (status === "wrong") return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
  return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
}

export default async function HistoryDetailPage({ params, searchParams }: Props) {
  const { attemptId } = await params
  const sp = await searchParams
  const isReviewMode = sp?.review === "1"

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  // Attempt + Antworten + Frage + Optionen (mit Erklärungen)
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: session.user.id as string },
    include: {
      exam: true,
      selectedQuestions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            select: {
              id: true,
              stem: true,
              explanation: true,
              case: { select: { id: true, vignette: true } },
              options: {
                orderBy: { id: "asc" },
                select: { id: true, text: true, isCorrect: true, explanation: true },
              },
            },
          },
        },
      },
      answers: {
        orderBy: { id: "asc" },
        include: {
          question: {
            select: {
              id: true,
              stem: true,
              explanation: true,
              case: { select: { id: true, vignette: true } },
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
  const answeredByQuestionId = new Map(attempt.answers.map(a => [a.questionId, a]))
  const selectedReviewItems = attempt.selectedQuestions.map((item) => {
    const answer = answeredByQuestionId.get(item.questionId)
    const status: ReviewStatus = answer ? (answer.isCorrect ? "correct" : "wrong") : "open"
    return { question: item.question, answer, status }
  })
  const fallbackReviewItems = attempt.answers.map((answer) => ({
    question: answer.question,
    answer,
    status: (answer.isCorrect ? "correct" : "wrong") as ReviewStatus,
  }))
  const reviewItems = selectedReviewItems.length > 0 ? selectedReviewItems : fallbackReviewItems
  const total = reviewItems.length
  const answeredCount = attempt.answers.length
  const wrongCount = reviewItems.filter(item => item.status === "wrong").length
  const openCount = reviewItems.filter(item => item.status === "open").length
  const caseCount = reviewItems.filter(item => !!item.question.case?.vignette).length
  const priorityItems = reviewItems.filter(item => item.status !== "correct")
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
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isReviewMode ? "Geführte Nachbereitung" : "Ergebnis"}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{attempt.exam.title}</h1>
            <p className="text-sm text-muted-foreground">
              {isReviewMode
                ? "Starte mit offenen und falschen Fragen. Danach folgen Fallfragen und die vollständige Auswertung."
                : "Auswertung deines Prüfungsdurchlaufs mit Antworten, Erklärungen und Review-Fokus."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {wrongCount > 0 && (
              <Button asChild>
                <Link href="/practice/deck/auto:wrong">Fehlertraining starten</Link>
              </Button>
            )}
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
          <div className="text-xs text-muted-foreground">{correctCount} von {total} richtig · {answeredCount} beantwortet</div>
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

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Review-Fokus</h2>
            <p className="text-sm text-muted-foreground">
              Arbeite zuerst die roten und gelben Fragen durch. Fallfragen sind zusätzlich markiert, weil sie meist mehrere Denkfehler bündeln.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-700 dark:bg-red-950/40 dark:text-red-300">{wrongCount} falsch</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{openCount} offen</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{caseCount} Fallfragen</span>
          </div>
        </div>

        {priorityItems.length > 0 ? (
          <div className="mt-4 space-y-3">
            {wrongCount > 0 && (
              <div className="rounded-xl border bg-red-50/70 p-3 text-sm dark:bg-red-950/20">
                <div className="font-medium text-red-800 dark:text-red-300">Direkt weiterlernen</div>
                <p className="mt-1 text-red-700 dark:text-red-300">
                  Wiederhole deine falsch beantworteten Fragen gebündelt im Fehlertraining.
                </p>
                <Button className="mt-3" size="sm" asChild>
                  <Link href="/practice/deck/auto:wrong">Fehlertraining starten</Link>
                </Button>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {priorityItems.slice(0, 6).map((item, idx) => (
                <a
                  key={item.question.id}
                  href={`#review-${item.question.id}`}
                  className="rounded-lg border bg-muted/20 px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="line-clamp-2">{idx + 1}. {item.question.stem}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${reviewBadgeClass(item.status)}`}>
                      {item.status === "wrong" ? "falsch" : "offen"}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-lg border bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-300">
            Keine falschen oder offenen Fragen. Nutze die Details unten für gezielte Wiederholung.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {reviewItems.map((item, idx) => {
          const q = item.question
          const a = item.answer
          const selectedId = a?.answerOption?.id
          const shouldOpen = isReviewMode && item.status !== "correct"
          return (
            <details
              key={q.id}
              id={`review-${q.id}`}
              open={shouldOpen}
              className="rounded-xl border bg-card shadow-sm scroll-mt-24"
            >
              <summary className="cursor-pointer select-none px-4 py-3 flex items-center justify-between gap-4">
                <span className="font-medium">Frage {idx + 1}: {q.stem}</span>
                <div className="flex shrink-0 items-center gap-2">
                  {q.case?.vignette && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">Fall</span>
                  )}
                  <span className={`rounded-full px-2.5 py-1 text-xs ${reviewBadgeClass(item.status)}`}>
                    {item.status === "correct" ? "richtig" : item.status === "wrong" ? "falsch" : "offen"}
                  </span>
                </div>
              </summary>

              <div className="px-4 pb-4 space-y-3">
                {q.case?.vignette && (
                  <details className="rounded-lg border bg-secondary/40" open={isReviewMode}>
                    <summary className="px-3 py-2 text-sm font-medium cursor-pointer">Falltext</summary>
                    <div className="px-3 pb-3 text-sm text-muted-foreground whitespace-pre-wrap">
                      {q.case.vignette}
                    </div>
                  </details>
                )}

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