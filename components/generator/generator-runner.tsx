"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { AnswerOptions } from "@/components/answer-options"
import { TextHighlighter } from "@/components/text-highlighter"
import { LabValuesDialog } from "@/components/lab-values-dialog"
import type { BulkQuestion } from "@/lib/question-bulk-json"
import { bulkQuestionsToRunnerFormat } from "@/lib/question-bulk-json"

type Props = {
  questions: BulkQuestion[]
  meta: { topic: string; difficulty: number; mode: "single" | "case" }
  explanationsPending?: boolean
  onNewGeneration: () => void
}

export function GeneratorRunner({
  questions: initialQuestions,
  meta,
  explanationsPending = false,
  onNewGeneration,
}: Props) {
  const [questions, setQuestions] = useState(initialQuestions)
  const [explanationsStatus, setExplanationsStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >(explanationsPending ? "loading" : "ready")
  const explanationsRequested = useRef(false)

  const runnerQuestions = useMemo(() => bulkQuestionsToRunnerFormat(questions), [questions])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | undefined>>({})
  const [qExpOpen, setQExpOpen] = useState(false)
  const [caseOpen, setCaseOpen] = useState(true)
  const [done, setDone] = useState(false)
  const [labOpen, setLabOpen] = useState(false)

  const q = runnerQuestions[idx]
  const given = answers[q.id]
  const showFeedback = !!given
  const atStart = idx === 0
  const atEnd = idx >= runnerQuestions.length - 1
  const answeredCount = Object.values(answers).filter(Boolean).length
  const allAnswered = answeredCount === runnerQuestions.length

  useEffect(() => {
    if (!explanationsPending || explanationsRequested.current) return
    explanationsRequested.current = true

    let cancelled = false
    setExplanationsStatus("loading")

    ;(async () => {
      try {
        const res = await fetch("/api/ai/generate-questions/explanations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: meta.topic,
            difficulty: meta.difficulty,
            mode: meta.mode,
            questions: initialQuestions,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok || !data.ok || !Array.isArray(data.questions)) {
          setExplanationsStatus("error")
          return
        }
        setQuestions(data.questions)
        setExplanationsStatus("ready")
      } catch {
        if (!cancelled) setExplanationsStatus("error")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [explanationsPending, initialQuestions, meta.difficulty, meta.mode, meta.topic])

  useEffect(() => {
    if (done) return
    function onKey(e: KeyboardEvent) {
      if (labOpen) {
        if (e.key === "Escape") setLabOpen(false)
        return
      }
      if (e.key === "l" || e.key === "L") {
        e.preventDefault()
        setLabOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [done, labOpen])

  function choose(optionId: string) {
    setAnswers((a) => ({ ...a, [q.id]: optionId }))
  }

  function goNext() {
    if (atEnd) {
      if (allAnswered) setDone(true)
      return
    }
    setIdx((i) => i + 1)
    setQExpOpen(false)
  }

  function goPrev() {
    if (!atStart) {
      setIdx((i) => i - 1)
      setQExpOpen(false)
    }
  }

  if (done) {
    const correct = runnerQuestions.filter((rq) => {
      const selected = answers[rq.id]
      const opt = rq.options.find((o) => o.id === selected)
      return !!opt?.isCorrect
    }).length

    return (
      <div className="mx-auto max-w-3xl space-y-6 py-4">
        <GeneratorDoneCard correct={correct} total={runnerQuestions.length} meta={meta} onNewGeneration={onNewGeneration} />
      </div>
    )
  }

  const hasOverallExplanation = !!q.explanation?.trim()
  const showExplanationBlock = showFeedback && (hasOverallExplanation || explanationsStatus === "loading")

  return (
    <div className="mx-auto max-w-4xl space-y-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          Generator · {meta.mode === "case" ? "Fallfrage" : "Einzelfrage"} · Schwierigkeit {meta.difficulty}/5
        </span>
        <GeneratorHeaderRight
          explanationsStatus={explanationsStatus}
          idx={idx}
          total={runnerQuestions.length}
          answeredCount={answeredCount}
          onLabOpen={() => setLabOpen(true)}
        />
      </div>

      <div className="rounded-lg border bg-card shadow-sm p-6 md:p-8 space-y-6">
        {q.caseVignette && (
          <div className="rounded-lg border bg-secondary/40">
            <button
              type="button"
              onClick={() => setCaseOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left font-semibold text-lg hover:bg-muted/50 transition-colors"
              aria-expanded={caseOpen}
            >
              <span>Fall</span>
              <svg
                className={`h-5 w-5 shrink-0 transition-transform duration-200 ${caseOpen ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
              </svg>
            </button>
            {caseOpen && (
              <div className="px-5 pb-5 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {q.caseVignette}
              </div>
            )}
          </div>
        )}

        <TextHighlighter text={q.stem} questionId={q.id} />

        <AnswerOptions options={q.options} selectedOptionId={given} onSelect={choose} showFeedback={showFeedback} />

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={goPrev} disabled={atStart}>
            ← Zurück
          </Button>
          <Button variant="outline" onClick={goNext} disabled={!given}>
            {atEnd ? "Abschließen" : "Weiter →"}
          </Button>
        </div>

        {showExplanationBlock && (
          <div className="rounded-lg border bg-secondary/40">
            {hasOverallExplanation ? (
              <>
                <button
                  type="button"
                  onClick={() => setQExpOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-base font-medium hover:bg-muted/50 transition-colors"
                  aria-expanded={qExpOpen}
                >
                  <span>Zusammenfassende Erläuterung</span>
                  <svg
                    className={`h-5 w-5 transition-transform duration-200 ${qExpOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                  </svg>
                </button>
                {qExpOpen && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {q.explanation}
                  </div>
                )}
              </>
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">Erklärungen werden noch geladen…</div>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Keine Speicherung · keine Decks · keine Markierungen
      </p>

      <LabValuesDialog open={labOpen} onClose={() => setLabOpen(false)} />
    </div>
  )
}

function GeneratorHeaderRight({
  explanationsStatus,
  idx,
  total,
  answeredCount,
  onLabOpen,
}: {
  explanationsStatus: "idle" | "loading" | "ready" | "error"
  idx: number
  total: number
  answeredCount: number
  onLabOpen: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {explanationsStatus === "loading" && (
        <span className="text-xs text-muted-foreground">Erklärungen werden geladen…</span>
      )}
      {explanationsStatus === "error" && (
        <span className="text-xs text-amber-600">Erklärungen nicht verfügbar – Kreuzen weiterhin möglich</span>
      )}
      <span className="text-sm text-muted-foreground">
        Frage {idx + 1}/{total} · {answeredCount} beantwortet
      </span>
      <Button variant="outline" size="sm" onClick={onLabOpen} title="Laborwerte (L)">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
        </svg>
        <span className="ml-2">Labor</span>
      </Button>
    </div>
  )
}

function GeneratorDoneCard({
  correct,
  total,
  meta,
  onNewGeneration,
}: {
  correct: number
  total: number
  meta: Props["meta"]
  onNewGeneration: () => void
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm text-center space-y-3">
      <h2 className="text-xl font-semibold">Durchlauf abgeschlossen</h2>
      <p className="text-sm text-muted-foreground">
        {correct} von {total} richtig · Thema: <strong>{meta.topic}</strong> · Schwierigkeit {meta.difficulty}/5
      </p>
      <p className="text-xs text-muted-foreground">
        Fragen werden nicht gespeichert. Du kannst direkt neue generieren.
      </p>
      <Button onClick={onNewGeneration} className="mt-2">
        Neue Fragen generieren
      </Button>
    </div>
  )
}
