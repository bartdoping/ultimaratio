"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Copy, Check as CheckIcon } from "lucide-react"
import { AnswerOptions } from "@/components/answer-options"
import { TextHighlighter, type HighlightSet } from "@/components/text-highlighter"
import { QuestionReport } from "@/components/generator/question-report"
import { AhaPanel } from "@/components/kreuzen/aha-panel"
import { ShareButton } from "@/components/share/share-button"
import { formatQuestionForSharing } from "@/lib/question-share"
import type { KreuzenItem } from "@/lib/kreuzen-types"
import { trackClient } from "@/lib/track-client"

/**
 * Eine Frage im Kreuz-Strom.
 *
 * Bedienung für eine Hand: Option antippen → unten "Prüfen" → Aha-Block →
 * "Weiter" (oder nach links wischen). Tastatur am Rechner: A–E/1–5 wählen,
 * ⇧ + Buchstabe streichen, Enter prüfen bzw. weiter.
 *
 * Die Lösung steckt in der ausgelieferten Frage — richtig/falsch erscheint
 * sofort, ohne Server. Der Server erfährt die Antwort im Hintergrund (auch
 * offline nachgereicht).
 */
export function QuestionCard({
  item,
  onAnswered,
  onNext,
  canNext,
  nachAufloesung,
}: {
  item: KreuzenItem
  onAnswered: (chosenText: string, ms: number, correct: boolean) => void
  onNext: () => void
  canNext: boolean
  /** Erscheint unter der Auflösung (Serie, Stufenvorschlag). */
  nachAufloesung?: React.ReactNode
}) {
  const q = item.question
  const options = useMemo(
    () => q.options.map((o, i) => ({ ...o, id: `${item.key}-${i}` })),
    [q.options, item.key]
  )
  const [gewaehlt, setGewaehlt] = useState<string | undefined>()
  const [aufgeloest, setAufgeloest] = useState(false)
  const [gestrichen, setGestrichen] = useState<Set<string>>(new Set())
  const [markierung, setMarkierung] = useState<HighlightSet>(() => new Set())
  const [vignetteMarkierung, setVignetteMarkierung] = useState<HighlightSet>(() => new Set())
  const [kopiert, setKopiert] = useState(false)
  const start = useRef(Date.now())
  const ahaRef = useRef<HTMLDivElement | null>(null)

  const gewaehlteOption = options.find((o) => o.id === gewaehlt)

  const pruefen = useCallback(() => {
    if (!gewaehlteOption || aufgeloest) return
    setAufgeloest(true)
    onAnswered(gewaehlteOption.text, Date.now() - start.current, gewaehlteOption.isCorrect)
    // Aha-Block ins Blickfeld holen — auf dem Handy liegt er sonst unter dem Daumen.
    requestAnimationFrame(() => ahaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }, [gewaehlteOption, aufgeloest, onAnswered])

  const strich = useCallback((id: string) => {
    setGestrichen((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }, [])

  // Tastatur
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      const idx = "abcde".indexOf(k) >= 0 ? "abcde".indexOf(k) : "12345".indexOf(k)
      if (idx >= 0 && idx < options.length) {
        e.preventDefault()
        if (aufgeloest) return
        if (e.shiftKey) strich(options[idx].id)
        else setGewaehlt(options[idx].id)
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        if (!aufgeloest) pruefen()
        else if (canNext) onNext()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [options, aufgeloest, pruefen, strich, canNext, onNext])

  // Wischen nach links = weiter (erst nach dem Auflösen).
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current
    touch.current = null
    if (!t || !aufgeloest || !canNext) return
    const dx = e.changedTouches[0].clientX - t.x
    const dy = e.changedTouches[0].clientY - t.y
    if (dx < -70 && Math.abs(dy) < 50) onNext()
  }

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(
        formatQuestionForSharing(q, { topic: item.topic, difficulty: item.difficulty }, window.location.origin)
      )
      setKopiert(true)
      trackClient("share_copied")
      window.setTimeout(() => setKopiert(false), 2000)
    } catch {
      // Zwischenablage gesperrt — still.
    }
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="space-y-4 pb-28">
      {q.caseVignette && (
        <div className="rounded-2xl border bg-muted/40 p-4">
          <TextHighlighter text={q.caseVignette} questionId={`${item.key}-v`} value={vignetteMarkierung} onChange={setVignetteMarkierung} />
        </div>
      )}

      <TextHighlighter text={q.stem} questionId={item.key} value={markierung} onChange={setMarkierung} />

      <AnswerOptions
        options={options}
        selectedOptionId={gewaehlt}
        onSelect={(id) => !aufgeloest && setGewaehlt(id)}
        showFeedback={aufgeloest}
        struckIds={gestrichen}
        onToggleStrike={strich}
        autoExpand={false}
      />

      {aufgeloest && gewaehlteOption && (
        <div ref={ahaRef} className="scroll-mt-32 lg:scroll-mt-20">
          <AhaPanel
            question={q}
            chosenText={gewaehlteOption.text}
            deepDive={
              item.poolQuestionId || item.savedId
                ? async () => {
                    const res = await fetch("/api/kreuzen/deepdive", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ poolQuestionId: item.poolQuestionId, savedId: item.poolQuestionId ? null : item.savedId }),
                    })
                    const d = await res.json().catch(() => ({}))
                    return d?.ok ? (d.text as string) : null
                  }
                : null
            }
          />
          <div className="mt-3 flex items-center justify-between">
            <QuestionReport
              stem={q.stem}
              options={q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))}
              caseVignette={q.caseVignette}
              meta={{ topic: item.topic, difficulty: item.difficulty, mode: "Einzelfrage" }}
              poolQuestionId={item.poolQuestionId}
            />
            {item.poolQuestionId ? (
              // Poolfragen sind öffentlich teilbar — mit Bildvorschau im Chat.
              <ShareButton
                compact
                url={`${typeof window !== "undefined" ? window.location.origin : ""}/f/${item.poolQuestionId}`}
                text={`Kreuzt du das richtig? ${item.topic}`}
              />
            ) : (
              <button
                type="button"
                onClick={kopieren}
                className="tap-target inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {kopiert ? <CheckIcon className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                {kopiert ? "Kopiert" : "Teilen"}
              </button>
            )}
          </div>
          {nachAufloesung && <div className="mt-3">{nachAufloesung}</div>}
        </div>
      )}

      {/* Daumenleiste */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 lg:left-60 border-t bg-background/90 px-4 pt-3 backdrop-blur-md"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.75rem)" }}
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          {!aufgeloest ? (
            <button
              type="button"
              onClick={pruefen}
              disabled={!gewaehlt}
              className="h-12 flex-1 rounded-full bg-primary text-base font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
            >
              Prüfen
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={!canNext}
              className="h-12 flex-1 rounded-full bg-primary text-base font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
            >
              {canNext ? "Weiter →" : "Nächste Frage lädt …"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
