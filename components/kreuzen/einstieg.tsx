"use client"

import { useState } from "react"
import { ArrowLeft, CalendarDays, GraduationCap, Stethoscope } from "lucide-react"
import { cn } from "@/lib/utils"
import { LEARN_PLANS, type LearnPlanId } from "@/lib/learn-plans"
import { todayIso } from "@/lib/learn-plan-progress"

export type EinstiegErgebnis =
  | { art: "plan"; planId: LearnPlanId; examDate: string | null; stufe: number }
  | { art: "stoebern" }

const NIVEAUS = [
  { stufe: 2, titel: "Ich fange gerade an", text: "Grundlagen festigen" },
  { stufe: 3, titel: "Ich bin mittendrin", text: "Examensniveau" },
  { stufe: 4, titel: "Ich will es schwer", text: "Mit Fallstricken" },
] as const

/**
 * Erster Besuch: drei Fragen, dann sofort die erste Frage. Kein Formular,
 * kein Konto — jeder Schritt ein Tipp. Ohne Einstieg landet ein neuer
 * Nutzer auf einer leeren Seite und muss erst überlegen, was er tippt.
 */
export function Einstieg({ onFertig }: { onFertig: (e: EinstiegErgebnis) => void }) {
  const [schritt, setSchritt] = useState<1 | 2 | 3>(1)
  const [planId, setPlanId] = useState<LearnPlanId | null>(null)
  const [datum, setDatum] = useState("")

  const zurueck =
    schritt > 1 ? (
      <button
        type="button"
        onClick={() => setSchritt((s) => (s === 3 ? 2 : 1))}
        className="tap-target -ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
        aria-label="Zurück"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </button>
    ) : (
      <span className="h-9 w-9" />
    )

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col px-4 pb-10 pt-6 lg:min-h-dvh">
      <div className="flex items-center justify-between">
        {zurueck}
        <div className="flex gap-1.5" aria-label={`Schritt ${schritt} von 3`}>
          {[1, 2, 3].map((i) => (
            <span key={i} className={cn("h-1.5 w-6 rounded-full", i <= schritt ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
        <button type="button" onClick={() => onFertig({ art: "stoebern" })} className="h-9 px-2 text-sm text-muted-foreground hover:text-foreground">
          Überspringen
        </button>
      </div>

      {schritt === 1 && (
        <div className="mt-10 flex-1 animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Wofür lernst du?</h1>
          <p className="mt-2 text-muted-foreground">Danach kommt jeden Tag das passende Thema — Frage um Frage.</p>
          <div className="mt-8 space-y-3">
            {(["m1", "m2"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setPlanId(id)
                  setSchritt(2)
                }}
                className="flex w-full items-center gap-4 rounded-2xl border bg-card p-5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {id === "m1" ? <GraduationCap className="h-5 w-5" aria-hidden /> : <Stethoscope className="h-5 w-5" aria-hidden />}
                </span>
                <span>
                  <span className="block text-lg font-semibold">{id === "m1" ? "Physikum" : "M2-Examen"}</span>
                  <span className="block text-sm text-muted-foreground">
                    {id === "m1" ? "Vorklinik: Biochemie, Physiologie, Anatomie …" : "Klinik: Innere, Chirurgie, Neuro, Pädiatrie …"}
                  </span>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => onFertig({ art: "stoebern" })}
              className="w-full rounded-2xl p-4 text-center text-sm text-muted-foreground hover:bg-muted/50"
            >
              Weder noch — ich will erst mal reinschnuppern
            </button>
          </div>
        </div>
      )}

      {schritt === 2 && planId && (
        <div className="mt-10 flex-1 animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Wann ist deine Prüfung?</h1>
          <p className="mt-2 text-muted-foreground">
            Dann zählen wir runter und verteilen den {LEARN_PLANS[planId].shortLabel}-Stoff bis dahin.
          </p>
          <label className="mt-8 flex items-center gap-3 rounded-2xl border bg-card p-4">
            <CalendarDays className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <input
              type="date"
              value={datum}
              min={todayIso()}
              onChange={(e) => setDatum(e.target.value)}
              className="h-10 w-full bg-transparent text-base outline-none"
              aria-label="Prüfungsdatum"
            />
          </label>
          <button
            type="button"
            disabled={!datum}
            onClick={() => setSchritt(3)}
            className="mt-4 h-12 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground disabled:opacity-40"
          >
            Weiter
          </button>
          <button
            type="button"
            onClick={() => {
              setDatum("")
              setSchritt(3)
            }}
            className="mt-2 h-11 w-full rounded-full text-sm text-muted-foreground hover:bg-muted"
          >
            Weiß ich noch nicht
          </button>
        </div>
      )}

      {schritt === 3 && planId && (
        <div className="mt-10 flex-1 animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Wo stehst du gerade?</h1>
          <p className="mt-2 text-muted-foreground">Lässt sich jederzeit ändern — die App schlägt dir auch selbst eine Stufe vor.</p>
          <div className="mt-8 space-y-3">
            {NIVEAUS.map((n) => (
              <button
                key={n.stufe}
                type="button"
                onClick={() => onFertig({ art: "plan", planId, examDate: datum || null, stufe: n.stufe })}
                className="flex w-full items-center justify-between rounded-2xl border bg-card p-5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <span>
                  <span className="block text-lg font-semibold">{n.titel}</span>
                  <span className="block text-sm text-muted-foreground">{n.text}</span>
                </span>
                <span className="text-sm font-medium text-primary">Los →</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
