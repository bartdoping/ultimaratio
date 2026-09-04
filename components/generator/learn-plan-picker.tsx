"use client"

import { useMemo } from "react"
import { CalendarDays, Check, Minus, Plus, Shuffle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  LEARN_PLANS,
  LEARN_PLAN_IDS,
  generatableTopics,
  getLearnPlanDay,
  planFirstDay,
  planLastDay,
  type LearnPlanId,
} from "@/lib/learn-plans"
import { completionRatio, dayForDate, daysBetween, todayIso } from "@/lib/learn-plan-progress"

type Props = {
  planId: LearnPlanId
  onPlanChange: (planId: LearnPlanId) => void
  day: number
  onDayChange: (day: number) => void
  disabled?: boolean
  /** Bereits bearbeitete Tage dieses Plans. */
  doneDays?: number[]
  /** Prüfungstermin (ISO-Datum) oder null. */
  examDate?: string | null
  onExamDateChange?: (iso: string | null) => void
  /**
   * Fest gewähltes Thema des Tages. `null` = beim Generieren wird zufällig
   * gezogen (Vorgabe). Wer gezielt üben will, wählt ein Thema aus.
   */
  selectedTopic?: string | null
  onSelectedTopicChange?: (topic: string | null) => void
}

/**
 * Auswahl von Lernplan und Tag.
 *
 * Zeigt zusätzlich, wo der Nutzer steht: bearbeitete Tage, Restzeit bis zur
 * Prüfung und der heute fällige Tag. Ein Lernplan ohne diese Einordnung ist
 * für die Vorbereitung nur eine Themenliste.
 */
export function LearnPlanPicker({
  planId,
  onPlanChange,
  day,
  onDayChange,
  disabled = false,
  doneDays = [],
  examDate = null,
  onExamDateChange,
  selectedTopic = null,
  onSelectedTopicChange,
}: Props) {
  const lastDay = planLastDay(planId)
  const entry = useMemo(() => getLearnPlanDay(planId, day), [planId, day])
  const topics = useMemo(() => generatableTopics(planId, day), [planId, day])
  const doneSet = useMemo(() => new Set(doneDays), [doneDays])

  const heute = todayIso()
  const restTage = examDate ? daysBetween(heute, examDate) : null
  const tagHeute = examDate ? dayForDate(planId, examDate, heute) : null
  const anteil = completionRatio(planId, doneDays)

  const clamp = (n: number) => Math.min(lastDay, Math.max(planFirstDay(), n))

  return (
    <div className="space-y-3">
      {/* Plan-Auswahl */}
      <div className="inline-flex items-center rounded-full border bg-background/80 p-0.5 text-xs">
        {LEARN_PLAN_IDS.map((id) => {
          const active = id === planId
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPlanChange(id)}
              disabled={disabled}
              aria-pressed={active}
              className={cn(
                "tap-target rounded-full px-3 py-1.5 font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {LEARN_PLANS[id].label}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          <label htmlFor="learnplan-day">Tag</label>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full border bg-background p-0.5">
          <button
            type="button"
            onClick={() => onDayChange(clamp(day - 1))}
            disabled={disabled || day <= planFirstDay()}
            aria-label="Vorheriger Tag"
            className="tap-target inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            id="learnplan-day"
            type="number"
            inputMode="numeric"
            min={planFirstDay()}
            max={lastDay}
            value={day}
            disabled={disabled}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n)) onDayChange(clamp(n))
            }}
            className="h-8 w-14 bg-transparent text-center text-sm font-semibold tabular-nums focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onDayChange(clamp(day + 1))}
            disabled={disabled || day >= lastDay}
            aria-label="Nächster Tag"
            className="tap-target inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <span className="text-xs text-muted-foreground">von {lastDay}</span>

        {doneSet.has(day) && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <Check className="h-3 w-3" aria-hidden="true" />
            bearbeitet
          </span>
        )}

        {entry && (
          <span className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-foreground">
            {entry.subject}
          </span>
        )}
      </div>

      {/* Schnellsprung über den Tagesbereich */}
      <input
        type="range"
        min={planFirstDay()}
        max={lastDay}
        value={day}
        disabled={disabled}
        onChange={(e) => onDayChange(clamp(Number(e.target.value)))}
        aria-label={`Tag ${day} von ${lastDay}`}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--primary)]"
      />

      {/* Fortschritt + Prüfungstermin */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-background/60 px-3 py-2">
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{doneSet.size}</span> von{" "}
          {lastDay} Tagen bearbeitet
          {anteil > 0 && (
            <span className="ml-1 tabular-nums">({Math.round(anteil * 100)} %)</span>
          )}
        </span>

        <span className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <label htmlFor="exam-date" className="text-muted-foreground">
            Prüfung am
          </label>
          <input
            id="exam-date"
            type="date"
            value={examDate ?? ""}
            disabled={disabled}
            onChange={(e) => onExamDateChange?.(e.target.value || null)}
            className="rounded-md border bg-background px-2 py-1 text-xs tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
          />
          {restTage !== null && restTage >= 0 && (
            <span className="text-muted-foreground tabular-nums">
              noch {restTage} {restTage === 1 ? "Tag" : "Tage"}
            </span>
          )}
          {tagHeute !== null && tagHeute !== day && (
            <button
              type="button"
              onClick={() => onDayChange(tagHeute)}
              disabled={disabled}
              className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary/20"
            >
              Heute: Tag {tagHeute}
            </button>
          )}
          {tagHeute !== null && tagHeute === day && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Heutiger Tag
            </span>
          )}
        </span>
      </div>

      {/* Themen des Tages — wählbar statt nur sichtbar */}
      <div className="rounded-xl border bg-background/60 p-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
          {topics.length} Themen an diesem Tag —{" "}
          {selectedTopic
            ? "ein Thema ist fest gewählt."
            : "beim Generieren wird eines gewählt, das noch nicht dran war."}
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          <li>
            <button
              type="button"
              onClick={() => onSelectedTopicChange?.(null)}
              disabled={disabled}
              aria-pressed={selectedTopic === null}
              className={cn(
                "tap-target rounded-full border px-2 py-0.5 text-xs leading-relaxed transition-colors",
                selectedTopic === null
                  ? "border-primary/60 bg-primary/10 font-medium text-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              Zufällig
            </button>
          </li>
          {topics.map((t) => {
            const aktiv = selectedTopic === t
            return (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => onSelectedTopicChange?.(aktiv ? null : t)}
                  disabled={disabled}
                  aria-pressed={aktiv}
                  title={aktiv ? "Auswahl aufheben" : `Gezielt zu „${t}" generieren`}
                  className={cn(
                    "tap-target rounded-full border px-2 py-0.5 text-xs leading-relaxed transition-colors",
                    aktiv
                      ? "border-primary/60 bg-primary/10 font-medium text-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
