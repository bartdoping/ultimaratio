"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

type Option = { id: string; text: string; isCorrect: boolean; explanation?: string | null }
type Question = {
  id: string
  stem: string
  explanation?: string | null
  options: Option[]
}

// ✅ mode ist jetzt optional; Default = "deck"
type Props = { mode?: "deck" | "all"; deckId?: string }

export default function SRRunnerClient({ mode = "deck", deckId }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState<Question | null>(null)
  const [dueLeft, setDueLeft] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const loadNext = useCallback(async () => {
    setLoading(true); setError(null); setSelected(null)
    try {
      const p = new URLSearchParams()
      if (mode === "deck" && deckId) p.set("deckId", deckId)
      if (mode === "all") p.set("all", "1")
      const res = await fetch(`/api/sr/next?${p.toString()}`, { cache: "no-store" })
      if (res.status === 204) { setDone(true); setQ(null); setDueLeft(0); return }
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || "Konnte nächste Karte nicht laden.")
      setQ(j.question as Question)
      setDueLeft(Number(j.dueLeft ?? 0))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [mode, deckId])

  useEffect(() => { loadNext() }, [loadNext])

  async function submit(optionId: string) {
    if (!q || selected) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/sr/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, answerOptionId: optionId }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || "Antwort konnte nicht gespeichert werden.")
      setSelected(optionId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Lade…</div>
  if (error) return <div className="text-sm text-red-600">{error}</div>
  if (done) return <div className="rounded border p-4">Heute nichts fällig. 🎉</div>
  if (!q) return null

  return (
    <div className="space-y-4 rounded border p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Fällig: {dueLeft}</div>
        <Button variant="outline" size="sm" onClick={loadNext}>
          {selected ? "Nächste Karte" : "Überspringen"}
        </Button>
      </div>

      <div className="font-medium">{q.stem}</div>

      <div className="space-y-2">
        {q.options.map(o => {
          const isSel = selected === o.id
          const reveal = !!selected
          return (
            <button
              key={o.id}
              disabled={submitting || !!selected}
              onClick={() => submit(o.id)}
              className={[
                "w-full text-left px-3 py-2 rounded border transition",
                isSel ? "ring-1 ring-blue-500" : "",
                reveal ? (o.isCorrect ? "bg-green-50 border-green-300" : isSel ? "bg-red-50 border-red-300" : "") : ""
              ].join(" ")}
            >
              {o.text}
              {reveal && isSel && (
                <span className={`ml-2 text-xs ${o.isCorrect ? "text-green-700" : "text-red-700"}`}>
                  {o.isCorrect ? "✓ richtig" : "✗ falsch"}
                </span>
              )}
              {reveal && isSel && o.explanation && (
                <div className="mt-1 text-xs text-muted-foreground">{o.explanation}</div>
              )}
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="rounded-lg border bg-muted/30 p-3">
          {q.explanation && (
            <div className="mb-3 text-sm text-muted-foreground whitespace-pre-wrap">
              {q.explanation}
            </div>
          )}
          <Button onClick={loadNext}>Weiter zur nächsten Karte</Button>
        </div>
      )}
    </div>
  )
}