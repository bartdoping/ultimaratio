"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, CalendarClock, Layers, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { GeneratorRunner } from "@/components/generator/generator-runner"
import { DifficultyBadge } from "@/components/generator/difficulty-badge"
import { cn } from "@/lib/utils"
import type { BulkQuestion } from "@/lib/question-bulk-json"
import type { GeneratorSection } from "@/lib/generator-section"

type SavedRow = {
  id: string
  topic: string
  difficulty: number
  mode: string
  section: GeneratorSection
  stem: string
  attempts: number
  correctCount: number
  quote: number | null
  lastCorrect: boolean | null
  dueAt: string | null
  createdAt: string
  question: BulkQuestion | null
}

type Antwort = {
  ok: boolean
  questions: SavedRow[]
  counts: { all: number; due: number; wrong: number; open: number }
  byTopic: { topic: string; attempts: number; correctCount: number; quote: number }[]
}

const FILTER = [
  { id: "due", label: "Fällig", hinweis: "Zur Wiederholung dran" },
  { id: "wrong", label: "Falsch beantwortet", hinweis: "Zuletzt danebengelegen" },
  { id: "open", label: "Noch offen", hinweis: "Noch nie beantwortet" },
  { id: "all", label: "Alle", hinweis: "Vollständige Ablage" },
] as const

type FilterId = (typeof FILTER)[number]["id"]

export function SavedQuestionsClient() {
  const [filter, setFilter] = useState<FilterId>("due")
  const [daten, setDaten] = useState<Antwort | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  /** Gerade geöffnete Frage — wird im normalen Runner bearbeitet. */
  const [offen, setOffen] = useState<SavedRow | null>(null)

  const laden = useCallback(async (f: FilterId) => {
    setLaedt(true)
    setFehler(null)
    try {
      const res = await fetch(`/api/meine-fragen?filter=${f}&limit=50`, {
        credentials: "include",
      })
      if (res.status === 401) {
        setFehler("Bitte melde dich an.")
        return
      }
      if (!res.ok) throw new Error("failed")
      setDaten((await res.json()) as Antwort)
    } catch {
      setFehler("Deine Fragen konnten nicht geladen werden.")
    } finally {
      setLaedt(false)
    }
  }, [])

  useEffect(() => {
    void laden(filter)
  }, [filter, laden])

  const loeschen = async (id: string) => {
    try {
      const res = await fetch(`/api/meine-fragen/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error("failed")
      setDaten((d) =>
        d ? { ...d, questions: d.questions.filter((q) => q.id !== id) } : d
      )
      toast.success("Frage entfernt.")
    } catch {
      toast.error("Konnte nicht entfernt werden.")
    }
  }

  const antwortMelden = useCallback((savedId: string, correct: boolean) => {
    void fetch(`/api/meine-fragen/${encodeURIComponent(savedId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ correct }),
    }).catch(() => {})
  }, [])

  // ---- Eine Frage ist geöffnet: derselbe Runner wie im Generator ----
  if (offen?.question) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <GeneratorRunner
          questions={[offen.question]}
          meta={{
            topic: offen.topic,
            difficulty: offen.difficulty,
            mode: offen.mode === "case" ? "case" : "single",
            section: offen.section,
          }}
          savedIds={[offen.id]}
          onAnswerRecorded={antwortMelden}
          onNewGeneration={() => {
            setOffen(null)
            void laden(filter)
          }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Meine Fragen</h1>
        <p className="text-sm text-muted-foreground">
          Jede generierte Frage wird hier gespeichert. Was du falsch beantwortest,
          kommt zur Wiederholung zurück.
        </p>
      </header>

      {/* Themenbilanz — wo stehst du? */}
      {daten && daten.byTopic.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Trefferquote je Thema</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Schwächstes Thema zuerst — Thema anklicken, um gezielt weiterzuüben.
          </p>
          <ul className="mt-3 space-y-2">
            {daten.byTopic.map((t) => (
              <li key={t.topic} className="flex items-center gap-3">
                {/* Anklickbar: direkt zu diesem Thema weiterüben. Eine Quote
                    anzuzeigen, ohne einen Weg zur Übung anzubieten, lässt den
                    Nutzer mit der Erkenntnis allein. */}
                <Link
                  href={`/generator?topic=${encodeURIComponent(t.topic)}`}
                  title={`Neue Frage zu „${t.topic}" generieren`}
                  className="w-40 shrink-0 truncate text-xs text-foreground underline-offset-2 hover:underline"
                >
                  {t.topic}
                </Link>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      t.quote < 50
                        ? "bg-rose-500"
                        : t.quote < 75
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    )}
                    style={{ width: `${t.quote}%` }}
                  />
                </span>
                <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {t.quote} % · {t.attempts}×
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER.map((f) => {
          const aktiv = f.id === filter
          const anzahl = daten?.counts[f.id]
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={aktiv}
              title={f.hinweis}
              className={cn(
                "tap-target rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                aktiv
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {f.label}
              {typeof anzahl === "number" && (
                <span className="ml-1.5 tabular-nums opacity-70">{anzahl}</span>
              )}
            </button>
          )
        })}
      </div>

      {laedt && <p className="text-sm text-muted-foreground">Wird geladen…</p>}
      {fehler && <p className="text-sm text-rose-600 dark:text-rose-400">{fehler}</p>}

      {!laedt && !fehler && daten?.questions.length === 0 && (
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === "due"
              ? "Nichts fällig. Gut gemacht — schau später wieder rein."
              : filter === "wrong"
                ? "Keine falsch beantworteten Fragen."
                : "Hier ist noch nichts."}
          </p>
          <Button asChild className="mt-4">
            <Link href="/generator">Frage generieren</Link>
          </Button>
        </div>
      )}

      <ul className="space-y-2">
        {daten?.questions.map((q) => (
          <li key={q.id} className="rounded-xl border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <DifficultyBadge level={q.difficulty} section={q.section} />
              <span className="rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {q.topic}
              </span>
              {q.mode === "case" && (
                <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  <Layers className="h-3 w-3" aria-hidden /> Fallfrage
                </span>
              )}
              {q.lastCorrect === false && (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-3 w-3" aria-hidden /> zuletzt falsch
                </span>
              )}
              {q.dueAt && new Date(q.dueAt) <= new Date() && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground">
                  <CalendarClock className="h-3 w-3" aria-hidden /> fällig
                </span>
              )}
              {q.quote !== null && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {q.correctCount}/{q.attempts} richtig
                </span>
              )}
            </div>

            <p className="mt-2 line-clamp-2 text-sm leading-snug text-foreground">{q.stem}</p>

            <div className="mt-2 flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={!q.question}
                onClick={() => setOffen(q)}
              >
                {q.attempts > 0 ? "Erneut versuchen" : "Beantworten"}
              </Button>
              <button
                type="button"
                onClick={() => void loeschen(q.id)}
                title="Frage entfernen"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Entfernen
              </button>
              {!q.question && (
                <span className="text-xs text-muted-foreground">
                  Inhalt beschädigt — bitte entfernen.
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
