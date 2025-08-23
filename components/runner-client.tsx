// components/runner-client.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

type Question = {
  id: string
  stem: string
  options: { id: string; text: string; isCorrect: boolean }[]
}

type Props = {
  attemptId: string
  examId: string
  passPercent: number
  allowImmediateFeedback: boolean
  questions: Question[]
  initialAnswers: Record<string, string | undefined>
}

function format(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function RunnerClient(props: Props) {
  const { attemptId, allowImmediateFeedback, questions, initialAnswers } = props
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | undefined>>(initialAnswers)
  const [submitting, setSubmitting] = useState(false)
  const [left, setLeft] = useState(60 * 60) // 60 Minuten Beispiel

  // Timer
  useEffect(() => {
    const t = setInterval(() => setLeft(v => (v > 0 ? v - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  // aktuelle Frage
  const q = questions[idx]
  const given = answers[q.id]

  async function choose(optionId: string) {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, answerOptionId: optionId }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Antwort konnte nicht gespeichert werden.")
      setAnswers(a => ({ ...a, [q.id]: optionId }))
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function finish() {
    if (!confirm("Prüfung wirklich beenden und auswerten?")) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/attempts/${attemptId}/finish`, { method: "POST" })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Konnte nicht auswerten.")
      router.push(`/dashboard/history/${attemptId}`)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const progress = useMemo(() => {
    const answered = Object.values(answers).filter(Boolean).length
    return `${answered}/${questions.length}`
  }, [answers, questions.length])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Frage {idx + 1} / {questions.length} ({progress})</span>
        <span>Zeit: {format(left)}</span>
      </div>

      <div className="rounded border p-4 space-y-3">
        <p className="font-medium">{q.stem}</p>
        <div className="space-y-2">
          {q.options.map(o => {
            const isSelected = given === o.id
            return (
              <button
                key={o.id}
                onClick={() => choose(o.id)}
                disabled={submitting}
                className={`w-full text-left rounded border px-3 py-2 ${isSelected ? "border-blue-500 ring-1 ring-blue-500" : ""}`}
              >
                {o.text}
                {allowImmediateFeedback && isSelected && (
                  <span className={`ml-2 text-xs ${o.isCorrect ? "text-green-600" : "text-red-600"}`}>
                    {o.isCorrect ? "✓ richtig" : "✗ falsch"}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>
          Zurück
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))} disabled={idx === questions.length - 1}>
            Weiter
          </Button>
          <Button variant="destructive" onClick={finish} disabled={submitting}>
            Beenden & Auswerten
          </Button>
        </div>
      </div>
    </div>
  )
}