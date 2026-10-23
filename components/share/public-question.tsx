"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Zap } from "lucide-react"
import { AnswerOptions } from "@/components/answer-options"
import { AhaPanel } from "@/components/kreuzen/aha-panel"
import { ShareButton } from "@/components/share/share-button"
import type { BulkQuestion } from "@/lib/question-bulk-json"

/**
 * Eine öffentliche Frage zum Selbst-Kreuzen — Ziel geteilter Links und der
 * "Frage des Tages". Wer sie gelöst hat, landet mit einem Tipp im Kreuz-Modus
 * beim selben Thema.
 */
export function PublicQuestion({
  poolQuestionId,
  topic,
  difficulty,
  question,
  shareUrl,
}: {
  poolQuestionId: string
  topic: string
  difficulty: number
  question: BulkQuestion
  shareUrl: string
}) {
  const options = useMemo(() => question.options.map((o, i) => ({ ...o, id: `o${i}` })), [question.options])
  const [gewaehlt, setGewaehlt] = useState<string | undefined>()
  const [aufgeloest, setAufgeloest] = useState(false)
  const [gestrichen, setGestrichen] = useState<Set<string>>(new Set())
  const [start] = useState(() => Date.now())
  const opt = options.find((o) => o.id === gewaehlt)

  function pruefen() {
    if (!opt) return
    setAufgeloest(true)
    void fetch("/api/kreuzen/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({ poolQuestionId, chosenText: opt.text, ms: Date.now() - start }),
    }).catch(() => {})
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-medium text-muted-foreground">
        {topic} · Stufe {difficulty}/5
      </div>
      {question.caseVignette && <div className="rounded-2xl border bg-muted/40 p-4 text-[15px] leading-relaxed">{question.caseVignette}</div>}
      <p className="whitespace-pre-wrap text-[17px] leading-relaxed">{question.stem}</p>

      <AnswerOptions
        options={options}
        selectedOptionId={gewaehlt}
        onSelect={(id) => !aufgeloest && setGewaehlt(id)}
        showFeedback={aufgeloest}
        struckIds={gestrichen}
        onToggleStrike={(id) =>
          setGestrichen((s) => {
            const n = new Set(s)
            if (n.has(id)) n.delete(id)
            else n.add(id)
            return n
          })
        }
        autoExpand={false}
      />

      {!aufgeloest ? (
        <button
          type="button"
          onClick={pruefen}
          disabled={!gewaehlt}
          className="h-12 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground disabled:opacity-40"
        >
          Prüfen
        </button>
      ) : (
        <>
          <AhaPanel
            question={question}
            chosenText={opt!.text}
            deepDive={async () => {
              const res = await fetch("/api/kreuzen/deepdive", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ poolQuestionId }),
              })
              const d = await res.json().catch(() => ({}))
              return d?.ok ? (d.text as string) : null
            }}
          />
          <Link
            href={`/kreuzen?thema=${encodeURIComponent(topic)}`}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-primary-foreground"
          >
            <Zap className="h-4 w-4" aria-hidden /> Mehr zu {topic.length > 28 ? "diesem Thema" : topic} kreuzen
          </Link>
          <ShareButton url={shareUrl} text={`Kreuzt du das richtig? ${topic}`} className="w-full" />
        </>
      )}
    </div>
  )
}
