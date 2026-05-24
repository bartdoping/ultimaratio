"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GeneratorRunner } from "@/components/generator/generator-runner"
import type { BulkQuestion } from "@/lib/question-bulk-json"
import { cn } from "@/lib/utils"

const TOPIC_MAX = 50

type Props = {
  canGenerate: boolean
}

type SessionState = {
  questions: BulkQuestion[]
  meta: { topic: string; difficulty: number; mode: "single" | "case" }
}

export function GeneratorPageClient({ canGenerate }: Props) {
  const [mode, setMode] = useState<"single" | "case">("single")
  const [caseCount, setCaseCount] = useState(3)
  const [difficulty, setDifficulty] = useState(3)
  const [topic, setTopic] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<SessionState | null>(null)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!canGenerate) return

    const trimmed = topic.trim()
    if (!trimmed) {
      setError("Bitte ein Thema eingeben.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: trimmed,
          difficulty,
          mode,
          caseQuestionCount: mode === "case" ? caseCount : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.upgradeRequired) {
          setError("Pro-Abo erforderlich für den Fragen-Generator.")
          return
        }
        setError(data.error || "Generierung fehlgeschlagen.")
        return
      }
      if (!data.ok || !Array.isArray(data.questions)) {
        setError("Unerwartete Server-Antwort.")
        return
      }
      setSession({
        questions: data.questions,
        meta: {
          topic: data.meta?.topic ?? trimmed,
          difficulty: data.meta?.difficulty ?? difficulty,
          mode: data.meta?.mode === "case" ? "case" : "single",
        },
      })
    } catch {
      setError("Netzwerkfehler. Bitte später erneut versuchen.")
    } finally {
      setLoading(false)
    }
  }

  if (session) {
    return (
      <GeneratorRunner
        questions={session.questions}
        meta={session.meta}
        onNewGeneration={() => setSession(null)}
      />
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Generator</h1>
        <p className="text-sm text-muted-foreground">
          KI-Prüfungsfragen generieren, direkt kreuzen – ohne Speicherung.
        </p>
      </div>

      {!canGenerate && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          Der Generator ist mit Pro verfügbar.{" "}
          <Link href="/subscription" className="font-medium underline">
            Pro freischalten
          </Link>
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <Label>Fragetyp</Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["single", "Einzelfrage"],
                ["case", "Fallfrage"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  mode === value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === "case" && (
          <div className="space-y-2">
            <Label>Anzahl Fragen zum Fall</Label>
            <div className="flex flex-wrap gap-2">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCaseCount(n)}
                  className={cn(
                    "h-10 w-10 rounded-lg border text-sm font-medium transition-colors",
                    caseCount === n
                      ? "border-primary bg-primary/10"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="difficulty">Schwierigkeitsgrad</Label>
            <span className="text-sm font-medium tabular-nums">{difficulty} / 5</span>
          </div>
          <input
            id="difficulty"
            type="range"
            min={1}
            max={5}
            step={1}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>1 · sehr leicht</span>
            <span>3 · Examensniveau</span>
            <span>5 · sehr schwer</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="topic">Thema</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {topic.length}/{TOPIC_MAX}
            </span>
          </div>
          <Input
            id="topic"
            value={topic}
            maxLength={TOPIC_MAX}
            placeholder="z. B. Akutes Koronarsyndrom"
            onChange={(e) => setTopic(e.target.value.slice(0, TOPIC_MAX))}
            disabled={!canGenerate || loading}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full" disabled={!canGenerate || loading}>
          {loading ? "Generiere…" : "Generieren"}
        </Button>
      </form>
    </div>
  )
}
