"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ChevronDown, Clock, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { QuestionCard } from "@/components/kreuzen/question-card"
import { AhaPanel } from "@/components/kreuzen/aha-panel"
import { ShareButton } from "@/components/share/share-button"
import type { useQuestionBuffer } from "@/components/kreuzen/use-question-buffer"
import type { KreuzenItem } from "@/lib/kreuzen-types"
import { LEARN_PLANS, type LearnPlanId } from "@/lib/learn-plans"
import { fachVonThema, faecher } from "@/lib/pruefungsreife"
import { normalizeTopic } from "@/lib/topic-key"

/**
 * Probeklausur: 20 Fragen quer durch den Lernplan, 90 Sekunden je Frage
 * (wie im schriftlichen Examen), Auflösung erst am Ende. Die Auswertung
 * zeigt das Ergebnis gegen die Bestehensgrenze und je Fach — und führt
 * direkt ins schwächste Fach.
 */

export const PROBE_FRAGEN = 20
const PROBE_ZEIT_MS = PROBE_FRAGEN * 90 * 1000
/** Bestehensgrenze der schriftlichen Staatsexamina (ohne Gleitklausel). */
const BESTEHENSGRENZE = 0.6

type Ergebnis = { item: KreuzenItem; chosenText: string; correct: boolean; ms: number }
type Buffer = ReturnType<typeof useQuestionBuffer>

function mmss(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

export function ProbeKlausur({
  planId,
  buffer,
  onHome,
  onNeu,
  onFachUeben,
}: {
  planId: LearnPlanId
  buffer: Buffer
  onHome: () => void
  onNeu: () => void
  onFachUeben: (fach: string) => void
}) {
  const [start] = useState(() => Date.now())
  const [jetzt, setJetzt] = useState(() => Date.now())
  const [ergebnisse, setErgebnisse] = useState<Ergebnis[]>([])
  const [fertig, setFertig] = useState(false)
  const [abgabeFrage, setAbgabeFrage] = useState(false)
  const anzahl = useRef(0)
  const ende = useRef<number | null>(null)

  const rest = PROBE_ZEIT_MS - (jetzt - start)

  useEffect(() => {
    if (fertig) return
    const t = window.setInterval(() => setJetzt(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [fertig])

  function abgeben() {
    ende.current = Date.now()
    setFertig(true)
    window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    if (!fertig && rest <= 0) abgeben()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rest, fertig])

  if (fertig) {
    return (
      <Auswertung
        planId={planId}
        ergebnisse={ergebnisse}
        dauerMs={(ende.current ?? Date.now()) - start}
        onHome={onHome}
        onNeu={onNeu}
        onFachUeben={onFachUeben}
      />
    )
  }

  const item = buffer.current
  const n = ergebnisse.length
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-3">
      <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 -mx-4 mb-3 border-b bg-background/90 px-4 py-2 backdrop-blur-md lg:top-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onHome}
            className="tap-target -ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Probeklausur abbrechen"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">Probeklausur · {LEARN_PLANS[planId].shortLabel}</div>
            <div className="text-xs tabular-nums text-muted-foreground">
              Frage {Math.min(n + 1, PROBE_FRAGEN)} von {PROBE_FRAGEN}
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums",
              rest < 5 * 60_000 ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-muted"
            )}
            aria-label={`Restzeit ${mmss(rest)}`}
          >
            <Clock className="h-3.5 w-3.5" aria-hidden /> {mmss(rest)}
          </span>
          {abgabeFrage ? (
            <button type="button" onClick={abgeben} className="h-9 rounded-full bg-foreground px-3 text-xs font-semibold text-background">
              Wirklich abgeben
            </button>
          ) : (
            <button
              type="button"
              onClick={() => (n > 0 ? setAbgabeFrage(true) : onHome())}
              className="h-9 rounded-full border px-3 text-xs font-medium hover:bg-muted"
            >
              Abgeben
            </button>
          )}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-primary transition-all" style={{ width: `${(n / PROBE_FRAGEN) * 100}%` }} />
        </div>
      </div>

      {item ? (
        <QuestionCard
          key={item.key}
          item={item}
          pruefungsModus
          onAnswered={(text, ms, correct) => {
            buffer.antworten(item, text, ms)
            anzahl.current += 1
            setErgebnisse((e) => [...e, { item, chosenText: text, correct, ms }])
          }}
          onNext={() => {
            if (anzahl.current >= PROBE_FRAGEN) abgeben()
            else {
              buffer.weiter()
              window.scrollTo({ top: 0 })
            }
          }}
          canNext
        />
      ) : buffer.grenze ? (
        <div className="rounded-3xl border bg-card p-6 text-center">
          <div className="text-lg font-semibold">Für heute keine weiteren Fragen</div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {n > 0 ? `Du kannst die Klausur mit ${n} Fragen auswerten.` : "Dein Tageskontingent ist erreicht."}
          </p>
          <button
            type="button"
            onClick={n > 0 ? abgeben : onHome}
            className="mt-4 h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
          >
            {n > 0 ? "Auswerten" : "Zur Übersicht"}
          </button>
        </div>
      ) : (
        <div className="space-y-3" aria-busy="true">
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted/70" />
          ))}
          <p className="pt-1 text-center text-sm text-muted-foreground">Nächste Frage wird vorbereitet …</p>
        </div>
      )}
    </div>
  )
}

function Auswertung({
  planId,
  ergebnisse,
  dauerMs,
  onHome,
  onNeu,
  onFachUeben,
}: {
  planId: LearnPlanId
  ergebnisse: Ergebnis[]
  dauerMs: number
  onHome: () => void
  onNeu: () => void
  onFachUeben: (fach: string) => void
}) {
  const [offen, setOffen] = useState<string | null>(null)
  const richtig = ergebnisse.filter((e) => e.correct).length
  const gesamt = ergebnisse.length
  const quote = gesamt ? richtig / gesamt : 0
  const bestanden = quote >= BESTEHENSGRENZE

  const jeFach = useMemo(() => {
    const map = fachVonThema(planId)
    const planFaecher = new Set(faecher(planId).map((f) => f.fach))
    const g = new Map<string, { richtig: number; gesamt: number }>()
    for (const e of ergebnisse) {
      const fach = map.get(normalizeTopic(e.item.topic)) ?? e.item.topic
      const x = g.get(fach) ?? { richtig: 0, gesamt: 0 }
      x.gesamt++
      if (e.correct) x.richtig++
      g.set(fach, x)
    }
    return [...g.entries()]
      .map(([fach, v]) => ({ fach, ...v, imPlan: planFaecher.has(fach) }))
      .sort((a, b) => a.richtig / a.gesamt - b.richtig / b.gesamt || b.gesamt - a.gesamt)
  }, [ergebnisse, planId])

  const fehler = ergebnisse.filter((e) => !e.correct)
  const schwaechstes = jeFach.find((f) => f.imPlan && f.richtig < f.gesamt)

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-16 pt-6">
      <div className="rounded-3xl border bg-card p-6 text-center" role="status">
        <GraduationCap className="mx-auto h-8 w-8 text-primary" aria-hidden />
        <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Probeklausur {LEARN_PLANS[planId].shortLabel}
        </div>
        <div className="mt-1 text-5xl font-bold tabular-nums">{Math.round(quote * 100)} %</div>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {richtig} von {gesamt} richtig · {mmss(dauerMs)} min
          {gesamt > 0 && ` · Ø ${Math.round(dauerMs / gesamt / 1000)} s je Frage`}
        </p>
        <p className={cn("mt-3 text-sm font-semibold", bestanden ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}>
          {gesamt === 0
            ? "Keine Frage beantwortet."
            : bestanden
              ? "Über der Bestehensgrenze von 60 %."
              : `Noch unter der Bestehensgrenze von 60 % — dir fehlen ${Math.ceil(BESTEHENSGRENZE * gesamt) - richtig} Fragen.`}
        </p>
        {gesamt < PROBE_FRAGEN && gesamt > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">Gewertet wurden nur die beantworteten Fragen.</p>
        )}
      </div>

      {jeFach.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">Nach Fach</h2>
          <ul className="space-y-2.5">
            {jeFach.map((f) => (
              <li key={f.fach} className="flex items-center gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate">{f.fach}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {f.richtig}/{f.gesamt}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className={cn("h-full rounded-full", f.richtig / f.gesamt >= BESTEHENSGRENZE ? "bg-emerald-500" : "bg-amber-500")}
                      style={{ width: `${(f.richtig / f.gesamt) * 100}%` }}
                    />
                  </div>
                </div>
                {f.imPlan && f.richtig < f.gesamt && (
                  <button
                    type="button"
                    onClick={() => onFachUeben(f.fach)}
                    className="h-8 shrink-0 rounded-full border px-3 text-xs font-medium hover:bg-muted"
                  >
                    Üben
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {fehler.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">Deine Fehler durchgehen ({fehler.length})</h2>
          <ul className="divide-y">
            {fehler.map((e) => (
              <li key={e.item.key} className="py-2">
                <button
                  type="button"
                  onClick={() => setOffen((o) => (o === e.item.key ? null : e.item.key))}
                  aria-expanded={offen === e.item.key}
                  className="flex w-full items-start gap-2 text-left text-sm"
                >
                  <span className="line-clamp-2 flex-1">{e.item.question.stem}</span>
                  <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 transition-transform", offen === e.item.key && "rotate-180")} aria-hidden />
                </button>
                {offen === e.item.key && (
                  <div className="mt-3 space-y-3">
                    {e.item.question.caseVignette && (
                      <p className="rounded-xl bg-muted/40 p-3 text-sm leading-relaxed">{e.item.question.caseVignette}</p>
                    )}
                    <p className="text-sm leading-relaxed">{e.item.question.stem}</p>
                    <AhaPanel question={e.item.question} chosenText={e.chosenText} deepDive={null} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Falsch beantwortete Fragen kommen automatisch zur Wiederholung.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {schwaechstes && (
          <button
            type="button"
            onClick={() => onFachUeben(schwaechstes.fach)}
            className="h-12 rounded-full bg-primary text-base font-semibold text-primary-foreground"
          >
            {schwaechstes.fach} gezielt üben
          </button>
        )}
        <button
          type="button"
          onClick={onNeu}
          className={cn(
            "h-11 rounded-full text-sm font-semibold",
            schwaechstes ? "border hover:bg-muted" : "bg-primary text-primary-foreground"
          )}
        >
          Neue Probeklausur
        </button>
        {gesamt > 0 && (
          <ShareButton
            label="Ergebnis teilen"
            url={typeof window !== "undefined" ? `${window.location.origin}/kreuzen` : "/kreuzen"}
            text={`${Math.round(quote * 100)} % in meiner ${LEARN_PLANS[planId].shortLabel}-Probeklausur auf fragenkreuzen — schaffst du mehr?`}
          />
        )}
        <button type="button" onClick={onHome} className="h-10 text-sm text-muted-foreground hover:text-foreground">
          Zur Übersicht
        </button>
      </div>
    </div>
  )
}
