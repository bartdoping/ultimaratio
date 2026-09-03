"use client"

import { useState } from "react"
import { Flag, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/**
 * Meldung einer fachlich beanstandeten Frage.
 *
 * Bei KI-erzeugten Prüfungsfragen ist Misstrauen der erste Reflex — und ohne
 * Ventil bleibt es beim Misstrauen. Der Knopf sitzt deshalb DIREKT an der
 * Frage, nicht im allgemeinen Feedback-Formular: Wer beim Lesen stutzt, meldet
 * genau in dem Moment, in dem er stutzt.
 *
 * Die Meldung geht über den bestehenden Feedback-Endpunkt (Kategorie
 * "question") und enthält die beanstandete Frage im Klartext — eine Meldung
 * ohne die Frage wäre nicht nachprüfbar.
 */

const GRUENDE = [
  { id: "falsch", label: "Fachlich falsch" },
  { id: "mehrdeutig", label: "Mehrere Antworten richtig" },
  { id: "unklar", label: "Unverständlich formuliert" },
  { id: "stufe", label: "Passt nicht zur Schwierigkeit" },
] as const

type Grund = (typeof GRUENDE)[number]["id"]

type Props = {
  stem: string
  options: { text: string; isCorrect: boolean }[]
  meta: { topic: string; difficulty: number; mode: string }
  caseVignette?: string | null
}

/** Baut den Meldetext. Gekürzt, damit das 2000-Zeichen-Limit sicher hält. */
function buildMessage(
  grund: Grund,
  notiz: string,
  { stem, options, meta, caseVignette }: Props
): string {
  const label = GRUENDE.find((g) => g.id === grund)?.label ?? grund
  const zeilen = [
    `Grund: ${label}`,
    `Thema: ${meta.topic} · Stufe ${meta.difficulty} · ${meta.mode}`,
    notiz.trim() ? `Anmerkung: ${notiz.trim().slice(0, 400)}` : "",
    "",
    caseVignette ? `Falltext: ${caseVignette.slice(0, 400)}` : "",
    `Frage: ${stem.slice(0, 600)}`,
    "Optionen:",
    ...options.map(
      (o, i) =>
        `  ${String.fromCharCode(65 + i)}) ${o.text.slice(0, 160)}${o.isCorrect ? "  <-- als richtig markiert" : ""}`
    ),
  ]
  return zeilen.filter(Boolean).join("\n").slice(0, 1990)
}

export function QuestionReport(props: Props) {
  const [offen, setOffen] = useState(false)
  const [grund, setGrund] = useState<Grund | null>(null)
  const [notiz, setNotiz] = useState("")
  const [sendet, setSendet] = useState(false)
  const [gesendet, setGesendet] = useState(false)

  async function senden() {
    if (!grund || sendet) return
    setSendet(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: "question",
          message: buildMessage(grund, notiz, props),
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      })
      if (!res.ok) throw new Error("failed")
      setGesendet(true)
      setOffen(false)
      toast.success("Danke — die Frage wird geprüft.")
    } catch {
      toast.error("Meldung konnte nicht gesendet werden.", {
        description: "Bitte später erneut versuchen.",
      })
    } finally {
      setSendet(false)
    }
  }

  if (gesendet) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        Gemeldet — danke.
      </span>
    )
  }

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden />
        Frage melden
      </button>
    )
  }

  return (
    <div className="w-full rounded-lg border bg-card p-3">
      <p className="text-xs font-medium text-foreground">Was stimmt mit der Frage nicht?</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {GRUENDE.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGrund(g.id)}
            aria-pressed={grund === g.id}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
              grund === g.id
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
      <textarea
        value={notiz}
        onChange={(e) => setNotiz(e.target.value)}
        rows={2}
        maxLength={400}
        placeholder="Optional: Was genau ist falsch?"
        className="mt-2 w-full resize-none rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
      />
      <p className="mt-1 text-[10px] text-muted-foreground">
        Die Frage und die Antwortoptionen werden zur Prüfung mitgesendet.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={senden}
          disabled={!grund || sendet}
          className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {sendet ? "Wird gesendet…" : "Melden"}
        </button>
        <button
          type="button"
          onClick={() => setOffen(false)}
          className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}
