"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { AnswerOptions } from "@/components/answer-options"
import { TextHighlighter, type HighlightSet } from "@/components/text-highlighter"
import { LabValuesDialog } from "@/components/lab-values-dialog"
import { DifficultyBadge } from "@/components/generator/difficulty-badge"
import type { BulkQuestion } from "@/lib/question-bulk-json"
import { bulkQuestionsToRunnerFormat } from "@/lib/question-bulk-json"
import { cn } from "@/lib/utils"
import { Target, AlertTriangle } from "lucide-react"

type Props = {
  questions: BulkQuestion[]
  meta: { topic: string; difficulty: number; mode: "single" | "case" }
  onNewGeneration: () => void
}

export function GeneratorRunner({ questions, meta, onNewGeneration }: Props) {
  const runnerQuestions = useMemo(() => bulkQuestionsToRunnerFormat(questions), [questions])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | undefined>>({})
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({})
  const [qExpOpen, setQExpOpen] = useState<Record<string, boolean>>({})
  const [caseOpen, setCaseOpen] = useState(true)
  const [done, setDone] = useState(false)
  const [labOpen, setLabOpen] = useState(false)
  const [highlightsByQ, setHighlightsByQ] = useState<Record<string, HighlightSet>>({})
  const [vignetteHighlights, setVignetteHighlights] = useState<HighlightSet>(() => new Set())

  const q = runnerQuestions[idx]
  const given = answers[q.id]
  const isConfirmed = !!confirmed[q.id]
  const showFeedback = isConfirmed
  const atStart = idx === 0
  const atEnd = idx >= runnerQuestions.length - 1
  const confirmedCount = Object.values(confirmed).filter(Boolean).length
  const allConfirmed = confirmedCount === runnerQuestions.length
  const expandedExplanation = !!qExpOpen[q.id]
  const stemHighlights = highlightsByQ[q.id] ?? new Set<number>()
  const setStemHighlights = useCallback(
    (next: HighlightSet) => {
      setHighlightsByQ((m) => ({ ...m, [q.id]: next }))
    },
    [q.id]
  )

  useEffect(() => {
    if (done) return
    function onKey(e: KeyboardEvent) {
      if (labOpen) {
        if (e.key === "Escape") setLabOpen(false)
        return
      }
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return
      if (e.key === "l" || e.key === "L") {
        e.preventDefault()
        setLabOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [done, labOpen])

  function choose(optionId: string) {
    if (isConfirmed) return
    setAnswers((a) => ({ ...a, [q.id]: optionId }))
  }

  function confirmAnswer() {
    if (!given || isConfirmed) return
    setConfirmed((c) => ({ ...c, [q.id]: true }))
    setQExpOpen((o) => ({ ...o, [q.id]: true }))
  }

  function goNext() {
    if (atEnd) {
      if (allConfirmed) setDone(true)
      return
    }
    setIdx((i) => i + 1)
  }

  function goPrev() {
    if (!atStart) setIdx((i) => i - 1)
  }

  if (done) {
    const correct = runnerQuestions.filter((rq) => {
      const selected = answers[rq.id]
      const opt = rq.options.find((o) => o.id === selected)
      return !!opt?.isCorrect
    }).length

    return (
      <div className="mx-auto max-w-3xl space-y-6 py-4 px-4">
        <GeneratorDoneCard
          correct={correct}
          total={runnerQuestions.length}
          meta={meta}
          onNewGeneration={onNewGeneration}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 py-2 px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
            {meta.mode === "case" ? "Fallfrage" : "Einzelfrage"}
          </span>
          <DifficultyBadge level={meta.difficulty} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium tabular-nums">
            Frage {idx + 1}/{runnerQuestions.length}
          </span>
          <span className="text-xs text-muted-foreground">
            · {confirmedCount} bestätigt
          </span>
          <Button variant="outline" size="sm" onClick={() => setLabOpen(true)} title="Laborwerte (L)">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
            </svg>
            <span className="ml-2">Labor</span>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-5 md:p-8 space-y-6">
        {q.caseVignette && (
          <div className="rounded-lg border bg-secondary/40">
            <button
              type="button"
              onClick={() => setCaseOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left font-semibold text-base md:text-lg hover:bg-muted/50 transition-colors"
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
                <TextHighlighter
                  text={q.caseVignette}
                  questionId={`${q.id}-case`}
                  value={vignetteHighlights}
                  onChange={setVignetteHighlights}
                />
              </div>
            )}
          </div>
        )}

        <TextHighlighter
          text={q.stem}
          questionId={q.id}
          value={stemHighlights}
          onChange={setStemHighlights}
        />
        <p className="text-xs text-muted-foreground">
          Tippe Wörter im Fragentext an, um sie zu markieren · erneut tippen entfernt die Markierung.
        </p>

        <AnswerOptions
          options={q.options}
          selectedOptionId={given}
          onSelect={choose}
          showFeedback={showFeedback}
          submitting={isConfirmed}
        />

        <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
          <Button variant="secondary" onClick={goPrev} disabled={atStart}>
            ← Zurück
          </Button>

          {!isConfirmed ? (
            <Button onClick={confirmAnswer} disabled={!given} className="ml-auto">
              Antwort bestätigen
            </Button>
          ) : (
            <Button onClick={goNext} className="ml-auto">
              {atEnd ? "Abschließen" : "Weiter →"}
            </Button>
          )}
        </div>

        {!isConfirmed && !given && (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Wähle eine Antwort und bestätige sie, um Lösung und Erklärungen zu sehen.
          </p>
        )}

        {q.explanation && showFeedback && (
          <div className="rounded-lg border bg-secondary/40">
            <button
              type="button"
              onClick={() =>
                setQExpOpen((o) => ({ ...o, [q.id]: !o[q.id] }))
              }
              className="w-full flex items-center justify-between px-4 py-3 text-base font-medium hover:bg-muted/50 transition-colors"
              aria-expanded={expandedExplanation}
            >
              <span>Gesamterklärung</span>
              <svg
                className={`h-5 w-5 transition-transform duration-200 ${expandedExplanation ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
              </svg>
            </button>
            {expandedExplanation && (
              <div className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {q.explanation}
              </div>
            )}
          </div>
        )}

        {showFeedback && (q.learningObjective || q.examTrap) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {q.learningObjective && (
              <InsightTile
                icon={<Target className="h-4 w-4" />}
                label="Lernziel"
                text={q.learningObjective}
                tone="emerald"
              />
            )}
            {q.examTrap && (
              <InsightTile
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Prüfungsfalle"
                text={q.examTrap}
                tone="amber"
              />
            )}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Keine Speicherung · keine Decks · Markierungen nur in dieser Session
      </p>

      <LabValuesDialog open={labOpen} onClose={() => setLabOpen(false)} />
    </div>
  )
}

function InsightTile({
  icon,
  label,
  text,
  tone,
}: {
  icon: React.ReactNode
  label: string
  text: string
  tone: "emerald" | "amber"
}) {
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
      : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300"
  return (
    <div className={cn("rounded-lg border px-3 py-3 text-sm leading-relaxed", toneClasses)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-foreground">{text}</p>
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
  const ratio = total > 0 ? correct / total : 0
  const tone =
    ratio >= 0.8 ? "text-emerald-600" : ratio >= 0.5 ? "text-amber-600" : "text-red-600"

  return (
    <div className="rounded-xl border bg-card p-6 md:p-8 shadow-sm text-center space-y-4">
      <h2 className="text-xl font-semibold">Durchlauf abgeschlossen</h2>
      <p className={`text-3xl font-semibold tabular-nums ${tone}`}>
        {correct} / {total}
      </p>
      <p className="text-sm text-muted-foreground">
        Thema: <strong className="text-foreground">{meta.topic}</strong> · Schwierigkeit {meta.difficulty}/5 ·{" "}
        {meta.mode === "case" ? "Fallfrage" : "Einzelfrage"}
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
