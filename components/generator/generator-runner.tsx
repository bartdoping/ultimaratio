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
import {
  Target,
  Lightbulb,
  Sparkles,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Layers,
  Wand2,
} from "lucide-react"
import { isMnemonicWorthShowing, isMustKnowWorthShowing } from "@/lib/insight-quality"

export type GeneratorQuickAction =
  | "same_again"
  | "harder"
  | "easier"
  | "as_case"
  | "new_topic"

type Props = {
  questions: BulkQuestion[]
  meta: { topic: string; difficulty: number; mode: "single" | "case" }
  onNewGeneration: () => void
  /** Optional: schnelle Folgeaktionen am Ende eines Durchlaufs. */
  onQuickAction?: (action: GeneratorQuickAction) => void
  isPro?: boolean
  quotaRemaining?: number | null
  onUpgrade?: () => void
  upgrading?: boolean
}

export function GeneratorRunner({
  questions,
  meta,
  onNewGeneration,
  onQuickAction,
  isPro = false,
  quotaRemaining = null,
  onUpgrade,
  upgrading = false,
}: Props) {
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
  /**
   * Bei welcher Frage-ID der Inline-Pro-Nudge gezeigt wurde. Pro Session/Run
   * wird er für maximal eine Frage angezeigt — danach erst wieder auf der
   * Done-Card. Bei akut knappem Kontingent (quotaRemaining <= 1) bleibt er
   * weiterhin sichtbar, weil das ein echter Limit-Hinweis ist.
   */
  const [inlineNudgeForQId, setInlineNudgeForQId] = useState<string | null>(null)

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
      // Modifier-Keys ignorieren, damit Browser-Shortcuts (Ctrl/Cmd+R etc.) erhalten bleiben.
      if (e.ctrlKey || e.metaKey || e.altKey) return

      // L = Labor öffnen
      if (e.key === "l" || e.key === "L") {
        e.preventDefault()
        setLabOpen(true)
        return
      }
      // A–E oder 1–5 = Antwort wählen
      const optionLetters = ["a", "b", "c", "d", "e"] as const
      const optionDigits = ["1", "2", "3", "4", "5"] as const
      const k = e.key.toLowerCase()
      const letterIdx = (optionLetters as readonly string[]).indexOf(k)
      const digitIdx = (optionDigits as readonly string[]).indexOf(k)
      const optIdx = letterIdx >= 0 ? letterIdx : digitIdx
      if (optIdx >= 0 && optIdx < q.options.length) {
        e.preventDefault()
        if (!isConfirmed) {
          choose(q.options[optIdx].id)
        }
        return
      }
      // Enter = Bestätigen / Weiter
      if (e.key === "Enter") {
        e.preventDefault()
        if (!isConfirmed && given) {
          confirmAnswer()
        } else if (isConfirmed && !atEnd) {
          setIdx((i) => Math.min(runnerQuestions.length - 1, i + 1))
        } else if (isConfirmed && atEnd && allConfirmed) {
          setDone(true)
        }
        return
      }
      // Pfeil rechts/links = Frage wechseln (nur Pre-/Post-Confirm-Nav, kein Bestätigen)
      if (e.key === "ArrowRight") {
        e.preventDefault()
        if (!atEnd) setIdx((i) => Math.min(runnerQuestions.length - 1, i + 1))
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        if (!atStart) setIdx((i) => Math.max(0, i - 1))
        return
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, labOpen, q.id, given, isConfirmed, atEnd, atStart, allConfirmed])

  function choose(optionId: string) {
    if (isConfirmed) return
    setAnswers((a) => ({ ...a, [q.id]: optionId }))
  }

  function confirmAnswer() {
    if (!given || isConfirmed) return
    setConfirmed((c) => ({ ...c, [q.id]: true }))
    setQExpOpen((o) => ({ ...o, [q.id]: true }))
    // Inline-Pro-Nudge nur beim ersten bestätigten Frage-Beleg dieser Session.
    if (!isPro && inlineNudgeForQId == null) {
      setInlineNudgeForQId(q.id)
    }
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
      <div className="mx-auto max-w-3xl space-y-4 py-4 px-4">
        <GeneratorDoneCard
          correct={correct}
          total={runnerQuestions.length}
          meta={meta}
          onNewGeneration={onNewGeneration}
          onQuickAction={onQuickAction}
        />
        {!isPro && onUpgrade && (
          <PostAnswerProNudge
            quotaRemaining={quotaRemaining}
            onUpgrade={onUpgrade}
            upgrading={upgrading}
          />
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 pb-28 pt-2 sm:pb-4">
      {/* Sticky-Top Progress + Lab-Button auf Mobile */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
            {meta.mode === "case" ? "Fallfrage" : "Einzelfrage"}
          </span>
          <DifficultyBadge level={meta.difficulty} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border bg-card/60 px-2.5 py-0.5 text-xs font-medium tabular-nums">
            <span>Frage {idx + 1}/{runnerQuestions.length}</span>
            <span className="text-muted-foreground">· {confirmedCount} bestätigt</span>
          </span>
          <Button variant="outline" size="sm" onClick={() => setLabOpen(true)} title="Laborwerte (L)">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
            </svg>
            <span className="ml-2 hidden sm:inline">Labor</span>
          </Button>
        </div>
      </div>

      {/* Schmale Progress-Leiste bei Fallfragen */}
      {runnerQuestions.length > 1 && (
        <div className="h-1 overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${Math.round(
                ((confirmedCount + (isConfirmed ? 0 : 0)) / runnerQuestions.length) * 100
              )}%`,
            }}
          />
        </div>
      )}

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

        {/* Desktop Action-Row */}
        <div className="hidden sm:flex flex-wrap items-center gap-2 pt-4 border-t">
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

        {/* Tastatur-Shortcuts Hint */}
        <p className="hidden sm:block text-[11px] text-muted-foreground/80">
          Tastatur: <kbd className="rounded border bg-muted/40 px-1">A</kbd>–<kbd className="rounded border bg-muted/40 px-1">E</kbd>{" "}
          oder <kbd className="rounded border bg-muted/40 px-1">1</kbd>–<kbd className="rounded border bg-muted/40 px-1">5</kbd> wählen ·{" "}
          <kbd className="rounded border bg-muted/40 px-1">Enter</kbd> bestätigen / weiter ·{" "}
          <kbd className="rounded border bg-muted/40 px-1">L</kbd> Labor ·{" "}
          <kbd className="rounded border bg-muted/40 px-1">←</kbd>/<kbd className="rounded border bg-muted/40 px-1">→</kbd> Frage wechseln
        </p>

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

        {showFeedback && (() => {
          // Qualitätsfilter: Box NUR rendern, wenn der Inhalt substanziell ist.
          // Schwache Eselsbrücken oder generische "Lernziele" werden weggelassen
          // — lieber gar keine Box als eine konstruierte.
          const showMustKnow = isMustKnowWorthShowing(q.mustKnow)
          const showMnemonic = isMnemonicWorthShowing(q.mnemonic)
          if (!showMustKnow && !showMnemonic) return null
          return (
            <div className="grid gap-3 sm:grid-cols-2">
              {showMustKnow && (
                <InsightTile
                  icon={<Target className="h-4 w-4" />}
                  label="Must-Know"
                  text={q.mustKnow as string}
                  tone="emerald"
                />
              )}
              {showMnemonic && (
                <InsightTile
                  icon={<Lightbulb className="h-4 w-4" />}
                  label="Lernhilfe"
                  text={q.mnemonic as string}
                  tone="amber"
                />
              )}
            </div>
          )
        })()}
      </div>

      {showFeedback && !isPro && onUpgrade && (() => {
        const lowQuota = quotaRemaining !== null && quotaRemaining <= 1
        // Standard: nur 1× pro Session am ersten Bestätigungs-Belegmoment.
        // Ausnahme: bei knappem Kontingent immer (echter Limit-Hinweis).
        const showHere = lowQuota || inlineNudgeForQId === q.id
        if (!showHere) return null
        return (
          <PostAnswerProNudge
            quotaRemaining={quotaRemaining}
            onUpgrade={onUpgrade}
            upgrading={upgrading}
          />
        )
      })()}

      <p className="text-center text-xs text-muted-foreground">
        Keine Speicherung · keine Decks · Markierungen nur in dieser Session
      </p>

      {/* MOBILE STICKY ACTION-BAR */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 px-4 py-3 backdrop-blur sm:hidden"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom),0.75rem)" }}
      >
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={goPrev}
            disabled={atStart}
            className="h-12 w-12 shrink-0 rounded-full p-0"
            aria-label="Vorherige Frage"
          >
            ←
          </Button>
          {!isConfirmed ? (
            <Button
              onClick={confirmAnswer}
              disabled={!given}
              className="h-12 flex-1 rounded-full text-base"
            >
              Antwort bestätigen
            </Button>
          ) : (
            <Button
              onClick={goNext}
              className="h-12 flex-1 rounded-full text-base"
            >
              {atEnd ? "Abschließen" : "Weiter →"}
            </Button>
          )}
        </div>
      </div>

      <LabValuesDialog open={labOpen} onClose={() => setLabOpen(false)} />
    </div>
  )
}

function PostAnswerProNudge({
  quotaRemaining,
  onUpgrade,
  upgrading,
}: {
  quotaRemaining: number | null
  onUpgrade: () => void
  upgrading: boolean
}) {
  const low = quotaRemaining !== null && quotaRemaining <= 1
  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-card to-card px-4 py-3 sm:flex sm:items-center sm:gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Pro
        </div>
        <p className="mt-0.5 text-sm">
          {low
            ? "Restkontingent fast aufgebraucht – mit Pro generierst du heute bis zu 100 Fragen."
            : "Mehr solcher Fragen heute generieren? Pro entfernt das Tageslimit."}
        </p>
      </div>
      <div className="mt-3 sm:mt-0">
        <Button size="sm" onClick={onUpgrade} disabled={upgrading}>
          {upgrading ? "Weiterleitung…" : "Pro freischalten"}
        </Button>
      </div>
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
  onQuickAction,
}: {
  correct: number
  total: number
  meta: Props["meta"]
  onNewGeneration: () => void
  onQuickAction?: (action: GeneratorQuickAction) => void
}) {
  const ratio = total > 0 ? correct / total : 0
  const tone =
    ratio >= 0.8
      ? "text-emerald-600 dark:text-emerald-400"
      : ratio >= 0.5
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400"

  const canHarder = meta.difficulty < 5
  const canEasier = meta.difficulty > 1
  const canCase = meta.mode === "single"

  return (
    <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm space-y-6">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          Durchlauf abgeschlossen
        </div>
        <p className={`text-4xl font-semibold tabular-nums ${tone}`}>
          {correct} <span className="text-xl text-muted-foreground">/ {total}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Thema: <strong className="text-foreground">{meta.topic}</strong>
          {" · "}
          Schwierigkeit {meta.difficulty}/5
          {" · "}
          {meta.mode === "case" ? "Fallfrage" : "Einzelfrage"}
        </p>
      </div>

      {onQuickAction && (
        <div className="space-y-3">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Direkt weiter
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <QuickActionButton
              icon={RotateCcw}
              label="Gleiches Thema"
              onClick={() => onQuickAction("same_again")}
            />
            <QuickActionButton
              icon={TrendingUp}
              label="Schwieriger"
              disabled={!canHarder}
              onClick={() => onQuickAction("harder")}
            />
            <QuickActionButton
              icon={TrendingDown}
              label="Einfacher"
              disabled={!canEasier}
              onClick={() => onQuickAction("easier")}
            />
            {canCase && (
              <QuickActionButton
                icon={Layers}
                label="Als Fallfrage"
                onClick={() => onQuickAction("as_case")}
              />
            )}
            <QuickActionButton
              icon={Wand2}
              label="Neues Thema"
              onClick={() => onQuickAction("new_topic")}
            />
          </div>
        </div>
      )}

      <div className="border-t pt-4 text-center">
        <Button onClick={onNewGeneration} variant="outline" size="sm">
          Zum Generator zurück
        </Button>
      </div>
    </div>
  )
}

function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-lg border bg-background/60 px-3 py-2.5 text-sm font-medium transition-all",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:border-primary/40 hover:bg-primary/5"
      )}
    >
      <Icon className={cn("h-4 w-4 text-muted-foreground", !disabled && "group-hover:text-primary")} />
      <span>{label}</span>
    </button>
  )
}
