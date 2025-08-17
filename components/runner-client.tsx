"use client"

import { useEffect, useMemo, useState } from "react"
import { ImageGallery } from "@/components/image-gallery"
import { LabValuesButton } from "@/components/lab-values"

type AttemptData = {
  attempt: { id: string; startedAt: string; finishedAt?: string | null; scorePercent?: number | null; passed?: boolean | null }
  exam: { id: string; title: string; passPercent: number; allowImmediateFeedback: boolean }
  questions: { id: string; stem: string; explanation?: string | null; hasImmediateFeedbackAllowed: boolean; options: { id: string; text: string }[]; images: { url: string; alt?: string }[] }[]
  answers: { questionId: string; answerOptionId: string; isCorrect: boolean }[]
}

export default function RunnerClient({ attemptId }: { attemptId: string }) {
  const [data, setData] = useState<AttemptData | null>(null)
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [reveal, setReveal] = useState<null | boolean>(null)
  const [loading, setLoading] = useState(false)
  const [finished, setFinished] = useState(false)
  const [result, setResult] = useState<{ total: number; correct: number; scorePercent: number; passed: boolean } | null>(null)

  // Timer: basiert auf startedAt → reload-sicher
  const elapsed = useElapsedSeconds(data?.attempt?.startedAt)

  // Load attempt
  useEffect(() => {
    fetch(`/api/attempts/${attemptId}`, { cache: "no-store" })
      .then(r => r.json()).then((d) => {
        if (d?.ok) {
          setData(d)
          // restore last answer for first question
          const qid = d.questions[0]?.id
          const a = d.answers.find((x: any) => x.questionId === qid)
          setSelected(a?.answerOptionId ?? null)
          setFinished(!!d.attempt.finishedAt)
        }
      }).catch(() => {})
  }, [attemptId])

  const q = data?.questions[idx]
  const total = data?.questions.length ?? 0
  const canReveal = !!q && (data?.exam.allowImmediateFeedback || q.hasImmediateFeedbackAllowed)

  async function saveAnswer(optionId: string) {
    if (!q) return
    setSelected(optionId)
    setReveal(null)
    try {
      const res = await fetch(`/api/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, answerOptionId: optionId, reveal: true }),
      })
      const d = await res.json()
      if (d?.ok && typeof d.isCorrect === "boolean") setReveal(d.isCorrect)
    } catch {}
  }

  function next() {
    if (!data) return
    const ni = Math.min(idx + 1, data.questions.length - 1)
    setIdx(ni)
    const nextQ = data.questions[ni]
    const a = data.answers.find((x: any) => x.questionId === nextQ.id)
    setSelected(a?.answerOptionId ?? null)
    setReveal(null)
  }
  function prev() {
    const pi = Math.max(idx - 1, 0)
    setIdx(pi)
    const prevQ = data?.questions[pi]
    if (prevQ && data) {
      const a = data.answers.find((x: any) => x.questionId === prevQ.id)
      setSelected(a?.answerOptionId ?? null)
      setReveal(null)
    }
  }

  async function finish() {
    if (!confirm("Prüfung wirklich abschließen?")) return
    setLoading(true)
    try {
      const r = await fetch(`/api/attempts/${attemptId}/finish`, { method: "POST" })
      const d = await r.json()
      if (d?.ok) {
        setFinished(true)
        setResult({ total: d.result.total, correct: d.result.correct, scorePercent: d.result.scorePercent, passed: d.result.passed })
      } else {
        alert(d?.error || "Konnte nicht abschließen.")
      }
    } catch {
      alert("Fehler beim Abschließen.")
    } finally {
      setLoading(false)
    }
  }

  if (!data) return <p>Lade…</p>

  if (finished) {
    const r = result || {
      total: total,
      correct: data.answers.filter(a => a.isCorrect).length,
      scorePercent: data.attempt.scorePercent ?? 0,
      passed: !!data.attempt.passed,
    }
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Ergebnis</h2>
        <p><strong>Score:</strong> {r.scorePercent}% – {r.passed ? "Bestanden ✅" : "Nicht bestanden ❌"} (Schwelle {data.exam.passPercent}%)</p>
        <p><strong>Korrekt:</strong> {r.correct} von {r.total}</p>
        <details className="rounded border p-3">
          <summary className="cursor-pointer">Erklärungen anzeigen</summary>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            {data.questions.map((qq) => (
              <li key={qq.id}>
                <div className="font-medium">{qq.stem}</div>
                {qq.explanation && <div className="text-sm text-muted-foreground">{qq.explanation}</div>}
              </li>
            ))}
          </ul>
        </details>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{data.exam.title}</h2>
          <div className="text-sm text-muted-foreground">Frage {idx + 1} / {total}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono">⏱ {formatSeconds(elapsed)}</div>
        </div>
      </header>

      {/* Progress */}
      <div className="w-full h-2 bg-gray-200 rounded">
        <div className="h-2 bg-black rounded" style={{ width: `${((idx + 1) / (total || 1)) * 100}%` }} />
      </div>

      {/* Frage */}
      <div className="space-y-3">
        <div className="font-medium">{q?.stem}</div>
        {q?.images?.length ? <ImageGallery images={q.images} /> : null}

        <fieldset className="space-y-2">
          {q?.options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 rounded border p-2">
              <input
                type="radio"
                name={`q-${q.id}`}
                checked={selected === o.id}
                onChange={() => saveAnswer(o.id)}
              />
              <span>{o.text}</span>
            </label>
          ))}
        </fieldset>

        <div className="flex items-center gap-2">
          <button className="btn" onClick={prev} disabled={idx === 0}>Zurück</button>
          <button className="btn" onClick={next} disabled={idx >= (total - 1)}>Nächste</button>
          <button className="btn" onClick={finish} disabled={loading}>Abschließen</button>
          <LabValuesButton />
          {canReveal && reveal !== null && (
            <span className={reveal ? "text-green-600" : "text-red-600"}>
              {reveal ? "Richtig ✅" : "Falsch ❌"}
            </span>
          )}
        </div>

        {!canReveal && <p className="text-xs text-muted-foreground">Sofort-Feedback ist für diese Prüfung/Frage deaktiviert.</p>}
      </div>
    </div>
  )
}

// Hilfsfunktionen
function useElapsedSeconds(startedAt?: string) {
  const started = useMemo(() => (startedAt ? new Date(startedAt).getTime() : Date.now()), [startedAt])
  const [t, setT] = useState(() => Math.floor((Date.now() - started) / 1000))
  useEffect(() => {
    const id = setInterval(() => setT(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(id)
  }, [started])
  return t
}

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h ? String(h).padStart(2, "0") + ":" : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}
